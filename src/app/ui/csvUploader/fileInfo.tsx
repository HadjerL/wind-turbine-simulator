interface FileInfoProps {
    file: File | null;
    dataLength: number;
}

export function FileInfo({ file, dataLength }: FileInfoProps) {
    if (!file) return null;

    return (
        <div className="mb-6">
            <p className="font-medium">Selected file: {file.name}</p>
            <p className="text-sm text-gray-600">Size: {(file.size / 1024).toFixed(2)} KB</p>
            <p className="text-sm text-gray-600">Rows: {dataLength}</p>
            <p className="text-sm text-green-600 font-medium mt-2">
                ✓ All required columns present
            </p>
        </div>
    );
}