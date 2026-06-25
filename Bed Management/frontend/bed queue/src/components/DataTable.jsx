import "../styles/Table.css";

function DataTable({ columns, data, actions }) {
  const formatPhone = (value) => {
    if (value == null) return "";
    const digits = value.toString().replace(/\D/g, "");
    return digits.length === 10 ? digits : value;
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => {
                  const rawValue = row[col.key];
                  const displayValue = col.render
                    ? col.render(rawValue, row)
                    : col.key === "phone"
                    ? formatPhone(rawValue)
                    : rawValue ?? "";
                  return (
                    <td key={col.key}>
                      {displayValue}
                    </td>
                  );
                })}
                {actions && (
                  <td className="action-buttons">
                    {actions.map((action) => {
                      const disabled = typeof action.disabled === "function"
                        ? action.disabled(row)
                        : action.disabled;

                      return (
                        <button
                          key={action.label}
                          type="button"
                          className={`action-btn ${action.type || "default"}`}
                          onClick={() => !disabled && action.onClick(row)}
                          disabled={disabled}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="no-data">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
