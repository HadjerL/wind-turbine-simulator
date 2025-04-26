interface ValidationErrorDisplayProps {
    error: string | null;
}

export function ValidationErrorDisplay({ error }: ValidationErrorDisplayProps) {
    if (!error) return null;

    return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-medium text-red-800 mb-2">Validation Error</h3>
            <p className="text-red-700">{error}</p>
        </div>
    );
}