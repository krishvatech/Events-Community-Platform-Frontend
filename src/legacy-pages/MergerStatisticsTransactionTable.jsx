import React from "react";

export default function MergerStatisticsTransactionTable({ table }) {
  return <div className="ms-table"><table><thead><tr>{table.columns.map((column, index) => <th key={`${column}-${index}`} scope="col" aria-label={column || "Unlabelled published source column"}>{column}</th>)}</tr></thead><tbody>{table.rows.map((row) => <tr key={row[0]}>{row.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div>;
}
