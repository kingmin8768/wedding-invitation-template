import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useInvitationConfig } from '../../hooks/useInvitationConfig';
import {
  fetchAdminInvitationSettings,
  mergeInvitationConfig,
  resetAdminInvitationSettings,
  saveAdminInvitationSettings,
} from '../../lib/invitationSettings';

const toMultilineText = (items) => (Array.isArray(items) ? items.join('\n') : '');

const fromMultilineText = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const createFormState = (config) => {
  const merged = mergeInvitationConfig(config);
  return {
    ...merged,
    transportBusesText: toMultilineText(merged.transport.buses),
    shuttleIntroText: toMultilineText(merged.transport.shuttleBus.intro),
    shuttleSchedulesText: toMultilineText(merged.transport.shuttleBus.schedules),
    wreathNoticeText: toMultilineText(merged.transport.wreathNotice),
  };
};

const InvitationSettingsAdminPanel = ({ accessToken }) => {
  const { config, setConfig } = useInvitationConfig();
  const [form, setForm] = useState(() => createFormState(config));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const latest = await fetchAdminInvitationSettings(accessToken);
        if (!active) {
          return;
        }
        setForm(createFormState(latest));
        setConfig(latest);
        setError('');
      } catch (err) {
        if (active) {
          setError(err.message || '설정을 불러오지 못했습니다.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [accessToken, setConfig]);

  const updateField = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const updateNestedField = (section, subSection, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [key]: value,
        },
      },
    }));
  };

  const updateAccountRow = (side, index, key, value) => {
    setForm((prev) => {
      const nextRows = prev.accounts[side].map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      );
      return {
        ...prev,
        accounts: {
          ...prev.accounts,
          [side]: nextRows,
        },
      };
    });
  };

  const addAccountRow = (side) => {
    setForm((prev) => ({
      ...prev,
      accounts: {
        ...prev.accounts,
        [side]: [...prev.accounts[side], { bank: '', number: '', name: '' }],
      },
    }));
  };

  const removeAccountRow = (side, index) => {
    setForm((prev) => ({
      ...prev,
      accounts: {
        ...prev.accounts,
        [side]: prev.accounts[side].filter((_, rowIndex) => rowIndex !== index),
      },
    }));
  };

  const buildPayload = () => ({
    couple: form.couple,
    parents: form.parents,
    wedding: {
      ...form.wedding,
      year: Number(form.wedding.year),
      month: Number(form.wedding.month),
      day: Number(form.wedding.day),
      hour: Number(form.wedding.hour),
      minute: Number(form.wedding.minute),
    },
    venue: {
      ...form.venue,
      lat: Number(form.venue.lat),
      lng: Number(form.venue.lng),
    },
    afterParty: form.afterParty,
    accounts: form.accounts,
    transport: {
      subway: form.transport.subway,
      buses: fromMultilineText(form.transportBusesText),
      shuttleBus: {
        enabled: form.transport.shuttleBus.enabled,
        intro: fromMultilineText(form.shuttleIntroText),
        schedules: fromMultilineText(form.shuttleSchedulesText),
      },
      parking: form.transport.parking,
      wreathNotice: fromMultilineText(form.wreathNoticeText),
    },
    share: form.share,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const saved = await saveAdminInvitationSettings(accessToken, buildPayload());
      setForm(createFormState(saved));
      setConfig(saved);
      setNotice('청첩장 내용이 저장되었습니다.');
    } catch (err) {
      setError(err.message || '청첩장 내용 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('모든 청첩장 문구와 계좌·예식 정보를 기본 샘플 값으로 초기화할까요?')
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const reset = await resetAdminInvitationSettings(accessToken);
      setForm(createFormState(reset));
      setConfig(reset);
      setNotice('기본 샘플 설정으로 초기화되었습니다.');
    } catch (err) {
      setError(err.message || '설정 초기화에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="admin-shell__empty">청첩장 설정을 불러오는 중입니다...</p>;
  }

  return (
    <form className="admin-panel-stack" onSubmit={handleSubmit}>
      {error && <p className="admin-shell__error">{error}</p>}
      {notice && <p className="admin-shell__success">{notice}</p>}

      <div className="admin-upload-form">
        <h3>커플 정보</h3>
        <div className="admin-settings-grid">
          <label>
            신랑 성명 (전체)
            <input
              type="text"
              value={form.couple.groom.fullName}
              onChange={(e) => updateNestedField('couple', 'groom', 'fullName', e.target.value)}
            />
          </label>
          <label>
            신랑 이름 (표시용)
            <input
              type="text"
              value={form.couple.groom.firstName}
              onChange={(e) => updateNestedField('couple', 'groom', 'firstName', e.target.value)}
            />
          </label>
          <label>
            신부 성명 (전체)
            <input
              type="text"
              value={form.couple.bride.fullName}
              onChange={(e) => updateNestedField('couple', 'bride', 'fullName', e.target.value)}
            />
          </label>
          <label>
            신부 이름 (표시용)
            <input
              type="text"
              value={form.couple.bride.firstName}
              onChange={(e) => updateNestedField('couple', 'bride', 'firstName', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="admin-upload-form">
        <h3>혼주 정보</h3>
        <div className="admin-settings-grid">
          <label>
            신랑측 아버지
            <input
              type="text"
              value={form.parents.groom.father}
              onChange={(e) => updateNestedField('parents', 'groom', 'father', e.target.value)}
            />
          </label>
          <label>
            신랑측 어머니
            <input
              type="text"
              value={form.parents.groom.mother}
              onChange={(e) => updateNestedField('parents', 'groom', 'mother', e.target.value)}
            />
          </label>
          <label>
            신랑측 관계 호칭
            <input
              type="text"
              value={form.parents.groom.relation}
              onChange={(e) => updateNestedField('parents', 'groom', 'relation', e.target.value)}
            />
          </label>
          <label>
            신부측 아버지
            <input
              type="text"
              value={form.parents.bride.father}
              onChange={(e) => updateNestedField('parents', 'bride', 'father', e.target.value)}
            />
          </label>
          <label>
            신부측 어머니
            <input
              type="text"
              value={form.parents.bride.mother}
              onChange={(e) => updateNestedField('parents', 'bride', 'mother', e.target.value)}
            />
          </label>
          <label>
            신부측 관계 호칭
            <input
              type="text"
              value={form.parents.bride.relation}
              onChange={(e) => updateNestedField('parents', 'bride', 'relation', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="admin-upload-form">
        <h3>예식 일시</h3>
        <div className="admin-settings-grid">
          <label>
            연도
            <input
              type="number"
              min="2000"
              max="2100"
              value={form.wedding.year}
              onChange={(e) => updateField('wedding', 'year', e.target.value)}
            />
          </label>
          <label>
            월
            <input
              type="number"
              min="1"
              max="12"
              value={form.wedding.month}
              onChange={(e) => updateField('wedding', 'month', e.target.value)}
            />
          </label>
          <label>
            일
            <input
              type="number"
              min="1"
              max="31"
              value={form.wedding.day}
              onChange={(e) => updateField('wedding', 'day', e.target.value)}
            />
          </label>
          <label>
            시 (24시간)
            <input
              type="number"
              min="0"
              max="23"
              value={form.wedding.hour}
              onChange={(e) => updateField('wedding', 'hour', e.target.value)}
            />
          </label>
          <label>
            분
            <input
              type="number"
              min="0"
              max="59"
              value={form.wedding.minute}
              onChange={(e) => updateField('wedding', 'minute', e.target.value)}
            />
          </label>
          <label>
            달력 월 표기
            <input
              type="text"
              value={form.wedding.monthLabel}
              onChange={(e) => updateField('wedding', 'monthLabel', e.target.value)}
            />
          </label>
        </div>
        <label>
          예식 일시 안내 문구
          <input
            type="text"
            value={form.wedding.displayDate}
            onChange={(e) => updateField('wedding', 'displayDate', e.target.value)}
          />
        </label>
      </div>

      <div className="admin-upload-form">
        <h3>예식장 정보</h3>
        <div className="admin-settings-grid">
          <label>
            웨딩홀 이름
            <input
              type="text"
              value={form.venue.name}
              onChange={(e) => updateField('venue', 'name', e.target.value)}
            />
          </label>
          <label>
            층 / 홀 이름
            <input
              type="text"
              value={form.venue.floor}
              onChange={(e) => updateField('venue', 'floor', e.target.value)}
            />
          </label>
          <label>
            위도 (lat)
            <input
              type="number"
              step="any"
              value={form.venue.lat}
              onChange={(e) => updateField('venue', 'lat', e.target.value)}
            />
          </label>
          <label>
            경도 (lng)
            <input
              type="number"
              step="any"
              value={form.venue.lng}
              onChange={(e) => updateField('venue', 'lng', e.target.value)}
            />
          </label>
        </div>
        <label>
          도로명 주소
          <input
            type="text"
            value={form.venue.address}
            onChange={(e) => updateField('venue', 'address', e.target.value)}
          />
        </label>
      </div>

      <div className="admin-upload-form">
        <h3>축의금 계좌 안내</h3>
        {(['groom', 'bride']).map((side) => (
          <div className="admin-panel-stack" key={side}>
            <div className="admin-list-card__top">
              <strong>{side === 'groom' ? '신랑측 계좌' : '신부측 계좌'}</strong>
              <button type="button" onClick={() => addAccountRow(side)}>
                + 계좌 추가
              </button>
            </div>
            {form.accounts[side].map((acc, index) => (
              <div className="admin-settings-account-row" key={`${side}-${index}`}>
                <input
                  type="text"
                  placeholder="은행명"
                  value={acc.bank}
                  onChange={(e) => updateAccountRow(side, index, 'bank', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="계좌번호"
                  value={acc.number}
                  onChange={(e) => updateAccountRow(side, index, 'number', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="예금주"
                  value={acc.name}
                  onChange={(e) => updateAccountRow(side, index, 'name', e.target.value)}
                />
                <button
                  className="admin-settings-danger-btn"
                  type="button"
                  onClick={() => removeAccountRow(side, index)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="admin-upload-form">
        <h3>교통 및 셔틀버스 안내</h3>
        <label>
          지하철 안내
          <input
            type="text"
            value={form.transport.subway}
            onChange={(e) => updateField('transport', 'subway', e.target.value)}
          />
        </label>
        <label>
          버스 안내 (줄바꿈으로 구분)
          <textarea
            rows={3}
            value={form.transportBusesText}
            onChange={(e) => setForm((prev) => ({ ...prev, transportBusesText: e.target.value }))}
          />
        </label>
        <label className="admin-settings-checkbox">
          <input
            type="checkbox"
            checked={form.transport.shuttleBus.enabled}
            onChange={(e) =>
              updateNestedField('transport', 'shuttleBus', 'enabled', e.target.checked)
            }
          />
          <span>셔틀버스 안내 표시</span>
        </label>
        {form.transport.shuttleBus.enabled && (
          <>
            <label>
              셔틀버스 소개 문구 (줄바꿈으로 구분)
              <textarea
                rows={2}
                value={form.shuttleIntroText}
                onChange={(e) => setForm((prev) => ({ ...prev, shuttleIntroText: e.target.value }))}
              />
            </label>
            <label>
              셔틀버스 일정 (줄바꿈으로 구분)
              <textarea
                rows={3}
                value={form.shuttleSchedulesText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, shuttleSchedulesText: e.target.value }))
                }
              />
            </label>
          </>
        )}
        <label>
          주차 안내
          <input
            type="text"
            value={form.transport.parking}
            onChange={(e) => updateField('transport', 'parking', e.target.value)}
          />
        </label>
        <label>
          화환 안내 (줄바꿈으로 구분)
          <textarea
            rows={2}
            value={form.wreathNoticeText}
            onChange={(e) => setForm((prev) => ({ ...prev, wreathNoticeText: e.target.value }))}
          />
        </label>
      </div>

      <div className="admin-upload-form">
        <h3>애프터 파티 및 공유 문구</h3>
        <label className="admin-settings-checkbox">
          <input
            type="checkbox"
            checked={form.afterParty.enabled}
            onChange={(e) => updateField('afterParty', 'enabled', e.target.checked)}
          />
          <span>애프터 파티 섹션 표시 (`/friend` 방문자용)</span>
        </label>
        {form.afterParty.enabled && (
          <>
            <label>
              애프터 파티 시간 안내
              <input
                type="text"
                value={form.afterParty.timeText}
                onChange={(e) => updateField('afterParty', 'timeText', e.target.value)}
              />
            </label>
            <label>
              애프터 파티 장소 주소
              <input
                type="text"
                value={form.afterParty.address}
                onChange={(e) => updateField('afterParty', 'address', e.target.value)}
              />
            </label>
            <label>
              애프터 파티 한마디 (선택)
              <input
                type="text"
                value={form.afterParty.postscript}
                onChange={(e) => updateField('afterParty', 'postscript', e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          공유 제목
          <input
            type="text"
            value={form.share.title}
            onChange={(e) => updateField('share', 'title', e.target.value)}
          />
        </label>
        <label>
          공유 설명
          <textarea
            rows={2}
            value={form.share.text}
            onChange={(e) => updateField('share', 'text', e.target.value)}
          />
        </label>
      </div>

      <div className="admin-settings-actions">
        <button className="admin-shell__logout" disabled={saving} type="submit">
          {saving ? '저장 중...' : '청첩장 내용 저장'}
        </button>
        <button
          className="admin-settings-secondary-btn"
          disabled={saving}
          onClick={handleReset}
          type="button"
        >
          기본 샘플로 초기화
        </button>
      </div>
    </form>
  );
};

InvitationSettingsAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default InvitationSettingsAdminPanel;
