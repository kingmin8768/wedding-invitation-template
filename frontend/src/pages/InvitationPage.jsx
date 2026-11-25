import { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/main.css';

import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import RsvpModal from '../components/RsvpModal';
import InvitationText from '../components/InvitationText';
import Calendar from '../components/Calendar';
import Gallery from '../components/Gallery';
import InvitationAssets from '../components/InvitationAssets';
import LocationMap from '../components/LocationMap';
import TransportInfo from '../components/TransportInfo';
import FamilyInfo from '../components/FamilyInfo';
import AfterPartySection from '../components/AfterPartySection';
import AccountInfo from '../components/AccountInfo';
import RsvpSection from '../components/RsvpSection';
// import SharedPhotoSection from '../components/SharedPhotoSection';
import Guestbook from '../components/Guestbook';
import TogetherCounter from '../components/TogetherCounter';
import Footer from '../components/Footer';
import FloatingButtons from '../components/FloatingButtons';
import Toast from '../components/Toast';
import DevToolsGuard from '../components/DevToolsGuard';
import { useAuth } from '../hooks/useAuth';
import { trackInvitationEvent } from '../lib/eventLogs';
import { isFriendVisitor } from '../lib/visitorEntry';
import { getVisitorName } from '../lib/visitorSession';
import {
  FALLBACK_PUBLIC_INVITATION_MEDIA,
  fetchPublicInvitationMedia,
  getInitialPublicInvitationMedia,
} from '../lib/invitationMedia';

const BGM_STORAGE_KEY = 'weddingInvitationBgmPreference';
const BGM_SOURCE = '/audio/canon-in-d.mp3';
const BGM_VOLUME = 0.28;

const InvitationPage = () => {
  const { tokens } = useAuth();
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [invitationMedia, setInvitationMedia] = useState(getInitialPublicInvitationMedia);
  const [showGuestbook, setShowGuestbook] = useState(() => isFriendVisitor());
  const [visitorName, setVisitorName] = useState(() => getVisitorName());
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const appRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const hasTrackedPageViewRef = useRef(false);

  useEffect(() => {
    setShowGuestbook(isFriendVisitor());
  }, []);

  useEffect(() => {
    if (!hasTrackedPageViewRef.current) {
      hasTrackedPageViewRef.current = true;
      trackInvitationEvent(
        {
          eventType: 'page_view',
          section: 'hero-top',
          action: 'view',
          label: '청첩장 진입',
        },
        { accessToken: tokens?.accessToken },
      ).catch(() => {});
    }

    AOS.init({
      duration: 1000,
      once: true,
      offset: 80,
    });

    const dismissed = localStorage.getItem('rsvp_dismissed');
    const today = new Date().toDateString();
    if (dismissed !== today) {
      const timer = setTimeout(() => setShowRsvpModal(true), 3400);
      return () => clearTimeout(timer);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    const targetId = window.sessionStorage.getItem(
      'weddingInvitationScrollTarget',
    );

    if (!targetId) {
      return;
    }

    window.sessionStorage.removeItem('weddingInvitationScrollTarget');
    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }, []);

  useEffect(() => {
    const sectionIds = [
      'hero-top',
      'invitation',
      'family',
      'calendar',
      'location',
      'together',
      'gallery',
      'invitation-assets',
      'shared-photos',
      ...(showGuestbook ? ['after-party'] : []),
      'rsvp',
      'account',
      ...(showGuestbook ? ['guestbook'] : []),
      'footer',
    ];
    const seenSections = new Set();
    const sectionElements = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || seenSections.has(entry.target.id)) {
            return;
          }

          seenSections.add(entry.target.id);
          trackInvitationEvent(
            {
              eventType: 'section_view',
              section: entry.target.id,
              action: 'view',
              label: `${entry.target.id} 섹션`,
            },
            { accessToken: tokens?.accessToken },
          ).catch(() => {});
        });
      },
      {
        threshold: 0.45,
      },
    );

    sectionElements.forEach((element) => observer.observe(element));

    const pageStartedAt = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return;
      }

      trackInvitationEvent(
        {
          eventType: 'engagement_time',
          action: 'duration',
          label: '페이지 체류 시간',
          metadata: {
            durationMs: Date.now() - pageStartedAt,
          },
        },
        { accessToken: tokens?.accessToken },
      ).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showGuestbook, tokens?.accessToken]);

  useEffect(() => {
    let isActive = true;

    const loadInvitationMedia = async () => {
      try {
        const data = await fetchPublicInvitationMedia();
        if (isActive) {
          setInvitationMedia(data);
        }
      } catch {
        if (isActive) {
          setInvitationMedia(FALLBACK_PUBLIC_INVITATION_MEDIA);
        }
      }
    };

    loadInvitationMedia();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(BGM_SOURCE);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = BGM_VOLUME;

    const syncPlayingState = () => {
      setBgmPlaying(!audio.paused);
    };

    const playBgm = async () => {
      try {
        await audio.play();
        window.localStorage.setItem(BGM_STORAGE_KEY, 'on');
        syncPlayingState();
        return true;
      } catch {
        syncPlayingState();
        return false;
      }
    };

    const handleFirstInteraction = async (event) => {
      if (event.target instanceof Element && event.target.closest('.header-bgm-btn')) {
        return;
      }

      if (window.localStorage.getItem(BGM_STORAGE_KEY) === 'off' || !audio.paused) {
        return;
      }

      const didPlay = await playBgm();
      if (didPlay) {
        document.removeEventListener('pointerdown', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
      }
    };

    const tryAutoplay = async () => {
      if (window.localStorage.getItem(BGM_STORAGE_KEY) === 'off') {
        return;
      }

      const didPlay = await playBgm();
      if (!didPlay) {
        document.addEventListener('pointerdown', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);
      }
    };

    audio.addEventListener('play', syncPlayingState);
    audio.addEventListener('pause', syncPlayingState);
    bgmAudioRef.current = audio;

    tryAutoplay();

    return () => {
      document.removeEventListener('pointerdown', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      audio.pause();
      audio.removeEventListener('play', syncPlayingState);
      audio.removeEventListener('pause', syncPlayingState);
      audio.src = '';
      bgmAudioRef.current = null;
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  };

  const handleBgmToggle = async () => {
    const audio = bgmAudioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        window.localStorage.setItem(BGM_STORAGE_KEY, 'on');
      } catch {
        showToast('브라우저에서 음악 재생을 막고 있어요. 화면을 한번 더 터치해 주세요.');
      }
      return;
    }

    audio.pause();
    window.localStorage.setItem(BGM_STORAGE_KEY, 'off');
  };

  const handleAnalyticsClickCapture = (event) => {
    const target = event.target.closest('[data-analytics-track]');

    if (!target || !appRef.current?.contains(target)) {
      return;
    }

    const eventType = target.dataset.analyticsTrack || 'click';
    const section = target.dataset.analyticsSection || target.closest('[data-analytics-section]')?.dataset.analyticsSection || null;
    const label =
      target.dataset.analyticsLabel ||
      target.getAttribute('aria-label') ||
      target.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ||
      null;

    trackInvitationEvent(
      {
        eventType,
        section,
        action: target.dataset.analyticsAction || 'click',
        label,
        metadata: {
          tagName: target.tagName.toLowerCase(),
          href: target.getAttribute('href') || null,
        },
      },
      { accessToken: tokens?.accessToken },
    ).catch(() => {});
  };

  const dismissRsvpToday = () => {
    localStorage.setItem('rsvp_dismissed', new Date().toDateString());
    setShowRsvpModal(false);
  };

  return (
    <>
      <DevToolsGuard />
      <div className="app-wrapper" ref={appRef} onClickCapture={handleAnalyticsClickCapture}>
        <Header
          bgmPlaying={bgmPlaying}
          onBgmToggle={handleBgmToggle}
          showGuestbook={showGuestbook}
        />

        <main>
          <section id="hero-top">
            <HeroSection media={invitationMedia.hero} />
          </section>

          <section id="invitation">
            <InvitationText />
          </section>

          <section id="family">
            <FamilyInfo />
          </section>

          <section id="calendar">
            <Calendar />
          </section>

          <section id="location">
            <LocationMap />
            <TransportInfo />
          </section>

          <section id="together">
            <TogetherCounter />
          </section>

          <section id="gallery">
            <Gallery media={invitationMedia} />
          </section>

          <section id="invitation-assets">
            <InvitationAssets />
          </section>

          {/*
          <section id="shared-photos">
            <SharedPhotoSection
              onUploadSuccess={(payload) => {
                trackInvitationEvent(
                  {
                    eventType: 'upload',
                    section: 'shared-photos',
                    action: 'submit',
                    label: payload.title || '공유 사진 업로드',
                  },
                  { accessToken: tokens?.accessToken },
                ).catch(() => {});
              }}
            />
          </section>
          */}

          {showGuestbook && (
            <section id="after-party">
              <AfterPartySection />
            </section>
          )}

          <section id="rsvp">
            <RsvpSection
              showAfterPartyAttendance={showGuestbook}
              onOpenForm={() => {
                trackInvitationEvent(
                  {
                    eventType: 'click',
                    section: 'rsvp',
                    action: 'open',
                    label: '참석 여부 전달 열기',
                  },
                  { accessToken: tokens?.accessToken },
                ).catch(() => {});
              }}
              onSubmitSuccess={(payload) => {
                setVisitorName(payload.name);
                trackInvitationEvent(
                  {
                    eventType: 'rsvp_submit',
                    section: 'rsvp',
                    action: payload.attendance,
                    label: payload.name,
                  },
                  { accessToken: tokens?.accessToken },
                ).catch(() => {});
              }}
            />
          </section>

          <section id="account">
            <AccountInfo showToast={showToast} />
          </section>

          {showGuestbook && (
            <section id="guestbook">
              <Guestbook
                defaultName={visitorName}
                onWriteOpen={() => {
                  trackInvitationEvent(
                    {
                      eventType: 'click',
                      section: 'guestbook',
                      action: 'open',
                      label: '방명록 작성 열기',
                    },
                    { accessToken: tokens?.accessToken },
                  ).catch(() => {});
                }}
                onSubmitSuccess={(payload) => {
                  trackInvitationEvent(
                    {
                      eventType: 'guestbook_submit',
                      section: 'guestbook',
                      action: 'submit',
                      label: payload.name,
                    },
                    { accessToken: tokens?.accessToken },
                  ).catch(() => {});
                }}
                showToast={showToast}
              />
            </section>
          )}

          <section id="footer">
            <Footer media={invitationMedia.footer} />
          </section>
        </main>

        <FloatingButtons
          onScrollTopClick={() => {
            trackInvitationEvent(
              {
                eventType: 'click',
                section: 'floating',
                action: 'scroll-top',
                label: '맨 위로',
              },
              { accessToken: tokens?.accessToken },
            ).catch(() => {});
          }}
          onShareResult={(result) => {
            trackInvitationEvent(
              {
                eventType:
                  result === 'success' || result === 'copy'
                    ? 'share_success'
                    : result === 'copy-fail'
                      ? 'share_fail'
                      : 'share_cancel',
                section: 'floating',
                action: result,
                label: '공유하기',
              },
              { accessToken: tokens?.accessToken },
            ).catch(() => {});
          }}
          showToast={showToast}
        />
      </div>

      <RsvpModal
        isOpen={showRsvpModal}
        onClose={() => setShowRsvpModal(false)}
        onDismissToday={dismissRsvpToday}
      />

      <Toast message={toastMsg} />
    </>
  );
};

export default InvitationPage;
