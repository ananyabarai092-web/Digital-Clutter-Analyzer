import { useState, useMemo } from 'react';
import { FiSearch, FiChevronLeft, FiChevronRight, FiArrowUp, FiArrowDown } from 'react-icons/fi';

const ITEMS_PER_PAGE = 25;

const FileDataTable = ({ 
  files, 
  columns, 
  onRowClick, 
  emptyMessage = 'No files found',
  emptyDescription = '',
  searchPlaceholder = 'Search files...',
  searchFields = ['name', 'path'],
  actions,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.toLowerCase();
    return files.filter(f => 
      searchFields.some(field => {
        const val = f[field];
        return val && val.toLowerCase().includes(q);
      })
    );
  }, [files, search, searchFields]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <FiArrowUp className="inline ml-1" size={12} /> : <FiArrowDown className="inline ml-1" size={12} />;
  };

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 transition-colors text-sm"
          />
        </div>
        <span className="text-sm text-gray-500">
          {filtered.length} file{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== files.length && ` (of ${files.length})`}
        </span>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="text-center py-12">
          <FiSearch className="mx-auto text-3xl text-gray-600 mb-3" />
          <p className="text-gray-400">{emptyMessage}</p>
          {emptyDescription && <p className="text-sm text-gray-500 mt-1">{emptyDescription}</p>}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                    className={col.sortable !== false ? 'cursor-pointer hover:text-white transition-colors select-none' : ''}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                    {col.sortable !== false && <SortIcon field={col.key} />}
                  </th>
                ))}
                {actions && <th style={{ width: '120px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.map((file, idx) => (
                <tr
                  key={file.path || idx}
                  onClick={() => onRowClick && onRowClick(file)}
                  className="cursor-pointer transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(file) : file[col.key] || '-'}
                    </td>
                  ))}
                  {actions && (
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {actions.map((action, ai) => (
                          <button
                            key={ai}
                            onClick={() => action.onClick(file)}
                            className="px-2 py-1 text-xs rounded bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white transition-colors cursor-pointer"
                            title={action.label}
                          >
                            {action.icon || action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDataTable;