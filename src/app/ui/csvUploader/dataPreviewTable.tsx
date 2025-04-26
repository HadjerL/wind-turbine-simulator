interface DataPreviewTableProps {
    columns: string[];
    data: Record<string, string | number | null>[];
    currentRowIndex: number;
    isPlaying: boolean;
}

export function DataPreviewTable({
    columns,
    data,
    currentRowIndex,
    isPlaying
}: DataPreviewTableProps) {
    if (data.length === 0) return null;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">
                {isPlaying ? 'Currently Showing' : 'Preview'} Row {currentRowIndex + 1}
            </h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                    <thead>
                        <tr>
                            {columns.map((header) => (
                                <th key={header} className="py-2 px-4 border-b bg-gray-50">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-blue-50">
                            {columns.map((header) => (
                                <td key={header} className="py-2 px-4 border-b">
                                    {data[currentRowIndex]?.[header] !== undefined 
                                        ? String(data[currentRowIndex][header]) 
                                        : 'N/A'}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}