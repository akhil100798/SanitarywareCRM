import { useEffect, useState } from 'react';
import { downloadFile } from '../services/fileUploadService';

export const useFilePreview = (fileName, type, localFile = null) => {
    const [preview, setPreview] = useState({ url: null, error: null });

    useEffect(() => {
        const controller = new AbortController();
        let objectUrl;
        setPreview({ url: null, error: null });
        if (localFile) {
            objectUrl = URL.createObjectURL(localFile);
            setPreview({ url: objectUrl, error: null });
        } else if (fileName) {
            downloadFile(fileName, type, controller.signal).then(blob => {
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(blob);
                setPreview({ url: objectUrl, error: null });
            }).catch(() => {
                if (!controller.signal.aborted) {
                    setPreview({ url: null, error: 'Unable to load attachment. Reload the page to try again.' });
                }
            });
        }
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileName, type, localFile]);

    return preview;
};
