import CSVUploader from "../csvUploader/csvUploader";


export default function UploadPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex w-full flex-row">
                <CSVUploader />
            </div>
        </div>
    );
}
