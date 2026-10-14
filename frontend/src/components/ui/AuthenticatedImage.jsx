import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { catalogueImagePath } from '../../utils/catalogueImagePath';

export default function AuthenticatedImage({ src, onError, ...props }) {
  const [image, setImage] = useState(null);
  const [failed, setFailed] = useState(false);
  const errorCallback = useRef(onError);
  useEffect(() => { errorCallback.current = onError; }, [onError]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let objectUrl;
    setImage(null);
    setFailed(false);
    (async () => {
      try {
        const path = catalogueImagePath(src, api.defaults.baseURL, window.location.origin);
        const response = await api.get(path, { responseType: 'blob', signal: controller.signal });
        if (!response.data.type.startsWith('image/')) throw new Error('Catalogue endpoint did not return an image');
        if (active) {
          objectUrl = URL.createObjectURL(response.data);
          setImage({ source: src, url: objectUrl });
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setFailed(true);
          errorCallback.current?.(error);
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  if (failed) return <span role="status">Image unavailable</span>;
  if (image?.source !== src) return <span role="status" aria-label="Loading catalogue image">Loading image...</span>;
  return <img {...props} src={image.url} onError={event => errorCallback.current?.(event)} />;
}
