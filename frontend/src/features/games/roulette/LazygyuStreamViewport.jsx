import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import RouletteCanvas from './RouletteCanvas';
import { WEBRTC_ICE_SERVERS } from './webrtcConfig';

const LazygyuStreamViewport = ({
  entries = [],
  isHost = false,
  phase = 'closed',
  round = null,
  socket,
}) => {
  const hostMountRef = useRef(null);
  const videoRef = useRef(null);
  const peerMapRef = useRef(new Map());
  const viewerPeerRef = useRef(null);
  const [hostAvailable, setHostAvailable] = useState(false);
  const [hostStatus, setHostStatus] = useState('호스트 대기 중');
  const [viewerStatus, setViewerStatus] = useState('대기 중');

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const peerMap = peerMapRef.current;

    const resetViewerStream = (status = '호스트 대기 중') => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      viewerPeerRef.current?.close();
      viewerPeerRef.current = null;
      setViewerStatus(status);
    };

    const handleHostChanged = (payload) => {
      setHostAvailable(Boolean(payload?.hostAvailable));
      if (isHost) {
        setHostStatus(payload?.hostAvailable ? '호스트 활성화됨' : '호스트 비활성화');
      }
      if (!isHost && payload?.hostAvailable) {
        socket.emit('viewer_request_stream');
      } else if (!isHost) {
        resetViewerStream('호스트 대기 중');
      }
    };

    const handleViewerRequest = async ({ viewerSocketId }) => {
      if (!isHost || !viewerSocketId) {
        return;
      }

      const canvas = hostMountRef.current?.querySelector('canvas');
      if (!canvas || typeof canvas.captureStream !== 'function') {
        setHostStatus('보드 준비 중');
        window.setTimeout(() => {
          handleViewerRequest({ viewerSocketId });
        }, 300);
        return;
      }

      setHostStatus('시청자에게 송출 중');

      const peerConnection = new RTCPeerConnection({
        iceServers: WEBRTC_ICE_SERVERS,
      });
      peerMap.set(viewerSocketId, peerConnection);
      const mediaStream = canvas.captureStream(60);
      mediaStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, mediaStream);
      });

      peerConnection.onicecandidate = (event) => {
        socket.emit('webrtc_ice_candidate', {
          targetSocketId: viewerSocketId,
          candidate: event.candidate?.toJSON() || null,
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'closed'
        ) {
          peerMap.delete(viewerSocketId);
          peerConnection.close();
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('webrtc_offer', {
        targetSocketId: viewerSocketId,
        description: offer,
      });
    };

    const handleOffer = async ({ fromSocketId, description }) => {
      if (isHost || !description) {
        return;
      }

      resetViewerStream('스트림 연결 중');
      const peerConnection = new RTCPeerConnection({
        iceServers: WEBRTC_ICE_SERVERS,
      });
      viewerPeerRef.current = peerConnection;
      setViewerStatus('스트림 연결 중');

      peerConnection.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0] || null;
          videoRef.current.play?.().catch(() => {});
          setViewerStatus('호스트 화면 시청 중');
        }
      };

      peerConnection.onicecandidate = (event) => {
        socket.emit('webrtc_ice_candidate', {
          targetSocketId: fromSocketId,
          candidate: event.candidate?.toJSON() || null,
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'disconnected'
        ) {
          resetViewerStream('스트림 재연결 중');
          socket.emit('viewer_request_stream');
        }
      };

      await peerConnection.setRemoteDescription(description);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('webrtc_answer', {
        targetSocketId: fromSocketId,
        description: answer,
      });
    };

    const handleAnswer = async ({ fromSocketId, description }) => {
      if (!isHost || !description) {
        return;
      }

      const peerConnection = peerMap.get(fromSocketId);
      if (!peerConnection) {
        return;
      }

      await peerConnection.setRemoteDescription(description);
    };

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const peerConnection = isHost
        ? peerMap.get(fromSocketId)
        : viewerPeerRef.current;

      if (!peerConnection || !candidate) {
        return;
      }

      await peerConnection.addIceCandidate(candidate);
    };

    const handleViewerDisconnected = ({ viewerSocketId }) => {
      if (!isHost || !viewerSocketId) {
        return;
      }

      const peerConnection = peerMap.get(viewerSocketId);
      if (!peerConnection) {
        return;
      }

      peerConnection.close();
      peerMap.delete(viewerSocketId);
    };

    const handleStreamError = ({ message }) => {
      if (isHost) {
        setHostStatus(message || '호스트 오류');
      } else {
        setViewerStatus(message || '스트림 오류 (TURN/STUN 설정 확인)');
      }
    };

    socket.on('stream_host_changed', handleHostChanged);
    socket.on('viewer_request_stream', handleViewerRequest);
    socket.on('viewer_disconnected', handleViewerDisconnected);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('stream_error', handleStreamError);

    if (isHost) {
      socket.emit('host_register');
      setHostAvailable(true);
      setHostStatus('호스트 등록 요청 중');
    } else if (!isHost) {
      socket.emit('viewer_request_stream');
    }

    return () => {
      socket.off('stream_host_changed', handleHostChanged);
      socket.off('viewer_request_stream', handleViewerRequest);
      socket.off('viewer_disconnected', handleViewerDisconnected);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('stream_error', handleStreamError);

      if (isHost) {
        socket.emit('host_unregister');
        setHostStatus('호스트 종료');
      }

      peerMap.forEach((peerConnection) => peerConnection.close());
      peerMap.clear();
      resetViewerStream('대기 중');
    };
  }, [isHost, socket]);

  return (
    isHost ? (
      <div className="lazygyu-host-shell" ref={hostMountRef}>
        <div className="lazygyu-host-shell__status">{hostStatus}</div>
        <RouletteCanvas entries={entries} phase={phase} round={round} />
      </div>
    ) : (
      <div className="lazygyu-board">
        <div className="lazygyu-board__topline">
          <div>
            <strong>lazygyu live stream</strong>
          </div>
          <span>{hostAvailable ? viewerStatus : '호스트 대기 중'}</span>
        </div>
        <div className="lazygyu-board__canvas lazygyu-board__canvas--viewer">
          {hostAvailable ? (
            <video
              autoPlay
              className="lazygyu-board__video"
              muted
              playsInline
              ref={videoRef}
            />
          ) : (
            <div className="lazygyu-board__empty">
              호스트가 보드를 열면 같은 화면을 시청할 수 있습니다.
            </div>
          )}
        </div>
      </div>
    )
  );
};

LazygyuStreamViewport.propTypes = {
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      displayName: PropTypes.string.isRequired,
      id: PropTypes.number,
    }),
  ),
  isHost: PropTypes.bool,
  phase: PropTypes.string,
  round: PropTypes.shape({
    id: PropTypes.number,
    seed: PropTypes.string,
    snapshotEntries: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          displayName: PropTypes.string.isRequired,
        }),
      ]),
    ),
    winnerRank: PropTypes.number,
    winnerName: PropTypes.string,
  }),
  socket: PropTypes.shape({
    emit: PropTypes.func,
    off: PropTypes.func,
    on: PropTypes.func,
  }),
};

export default LazygyuStreamViewport;
