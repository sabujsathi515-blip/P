import { useState, useEffect } from 'react';

export interface MediaDeviceInfoList {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export const useWebRTC = () => {
  const [devices, setDevices] = useState<MediaDeviceInfoList>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [permissions, setPermissions] = useState<{
    camera: PermissionState | 'unknown';
    microphone: PermissionState | 'unknown';
  }>({
    camera: 'unknown',
    microphone: 'unknown',
  });

  const refreshDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return;
    }
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: devList.filter((d) => d.kind === 'audioinput'),
        videoInputs: devList.filter((d) => d.kind === 'videoinput'),
        audioOutputs: devList.filter((d) => d.kind === 'audiooutput'),
      });
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
    }
  };

  const checkPermissions = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null);
        const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null);

        setPermissions({
          camera: camPerm ? camPerm.state : 'unknown',
          microphone: micPerm ? micPerm.state : 'unknown',
        });
      } catch (_) {
        // Some browsers don't support camera/mic in permissions.query
      }
    }
  };

  useEffect(() => {
    refreshDevices();
    checkPermissions();

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, []);

  return {
    devices,
    permissions,
    refreshDevices,
    checkPermissions,
  };
};
