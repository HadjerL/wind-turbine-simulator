import CSVUploader from "./csvUploader";


export default function UploadPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-row">
                <CSVUploader />
            </div>
        </div>
    );
}
