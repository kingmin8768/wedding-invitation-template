import { useEffect } from 'react';

const DevToolsGuard = () => {
  useEffect(() => {
    // 우클릭 차단
    const handleContextMenu = (e) => {
      e.preventDefault();
      alert('우클릭이 비활성화 되어있습니다.');
      return false;
    };

    // 키보드 단축키 차단 (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        alert('개발자 도구를 사용할 수 없습니다.');
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        alert('개발자 도구를 사용할 수 없습니다.');
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        alert('소스 보기를 사용할 수 없습니다.');
        return false;
      }
    };

    // debugger 기반 개발자 도구 감지
    let devToolsDetected = false;
    const detectDevTools = () => {
      const start = performance.now();
      // debugger는 개발자 도구가 열려있을 때 지연됨
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100 && !devToolsDetected) {
        devToolsDetected = true;
        alert('개발자 도구를 사용하지 말아주세요!');
        setTimeout(() => { devToolsDetected = false; }, 3000);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // debugger 감지는 개발 모드에서는 비활성화
    let interval;
    if (import.meta.env.PROD) {
      interval = setInterval(detectDevTools, 2000);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (interval) clearInterval(interval);
    };
  }, []);

  return null;
};

export default DevToolsGuard;
