import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

try:
    from bson import ObjectId
    from pymongo import MongoClient, DESCENDING
except Exception:  # pragma: no cover - local fallback when deps are not installed yet
    ObjectId = None
    MongoClient = None
    DESCENDING = -1


DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def utcnow() -> datetime:
    return datetime.utcnow()


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, datetime):
            out[key] = value.isoformat()
    return out


class LocalCollection:
    def __init__(self, name: str):
        self.path = DATA_DIR / f"{name}.json"
        if not self.path.exists():
            self.path.write_text("[]", encoding="utf-8")

    def _load(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _save(self, docs: List[Dict[str, Any]]) -> None:
        self.path.write_text(json.dumps(docs, indent=2, default=str), encoding="utf-8")

    def create_index(self, *args, **kwargs) -> None:
        return None

    def find_one(self, query: Dict[str, Any], sort: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        docs = self.find(query, sort=sort, limit=1)
        return docs[0] if docs else None

    def insert_one(self, document: Dict[str, Any]):
        docs = self._load()
        record = dict(document)
        record["_id"] = str(uuid4())
        docs.append(record)
        self._save(docs)

        class Result:
            inserted_id = record["_id"]

        return Result()

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        docs = self._load()
        matched = False
        for doc in docs:
            if self._matches(doc, query):
                doc.update(update.get("$set", {}))
                matched = True
                break
        if upsert and not matched:
            new_doc = dict(query)
            new_doc.update(update.get("$set", {}))
            new_doc["_id"] = str(uuid4())
            docs.append(new_doc)
        self._save(docs)

    def delete_many(self, query: Dict[str, Any]):
        docs = [doc for doc in self._load() if not self._matches(doc, query)]
        self._save(docs)

    def find(self, query: Optional[Dict[str, Any]] = None, sort: Optional[List[Any]] = None, limit: int = 0):
        docs = [doc for doc in self._load() if self._matches(doc, query or {})]
        if sort:
            key, direction = sort[0]
            docs.sort(key=lambda d: d.get(key, ""), reverse=direction in (-1, DESCENDING))
        if limit:
            docs = docs[:limit]
        return docs

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for key, expected in query.items():
            if doc.get(key) != expected:
                return False
        return True


class Database:
    def __init__(self):
        uri = os.getenv("MONGODB_URI")
        self.using_mongo = bool(uri and MongoClient)
        if self.using_mongo:
            self.client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db_name = os.getenv("MONGODB_DB", "clutterguard")
            self.db = self.client[db_name]
        else:
            self.client = None
            self.db = None

    def collection(self, name: str):
        if self.using_mongo:
            return self.db[name]
        return LocalCollection(name)

    def init_indexes(self) -> None:
        try:
            users = self.collection("users")
            users.create_index("email", unique=True)
            self.collection("scan_history").create_index([("user_id", 1), ("created_at", DESCENDING)])
            self.collection("notifications").create_index([("user_id", 1), ("created_at", DESCENDING)])
            self.collection("reports").create_index([("user_id", 1), ("created_at", DESCENDING)])
        except Exception:
            self.using_mongo = False


database = Database()


def get_collection(name: str):
    return database.collection(name)
