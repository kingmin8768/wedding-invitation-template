import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInvitationMedia,
  deleteInvitationMedia,
  fetchAdminInvitationMedia,
  updateInvitationMedia,
} from '../../lib/invitationMedia';
import { IMAGE_UPLOAD_HINT, optimizeImageForUpload } from '../../lib/imageUpload';

const normalizeFiles = (fileList) => Array.from(fileList || []);

const resolveCaption = (caption, file, index, total) => {
  const trimmedCaption = caption.trim();

  if (!trimmedCaption) {
    return file.name.replace(/\.[^.]+$/, '');
  }

  if (total === 1) {
    return trimmedCaption;
  }

  return `${trimmedCaption} ${index + 1}`;
};

const SLOT_DEFINITIONS = [
  {
    slot: 'hero',
    label: '메인 이미지',
    description: '청첩장 첫 화면에 보이는 대표 이미지를 관리합니다.',
    buttonLabel: '메인 이미지 추가',
    single: true,
  },
  {
    slot: 'couple',
    label: '소개 이미지',
    description: '신랑신부 소개 영역의 이미지를 관리합니다.',
    buttonLabel: '소개 이미지 추가',
    single: true,
  },
  {
    slot: 'gallery',
    label: '갤러리',
    description: '공개 갤러리에 들어갈 이미지를 순서대로 관리합니다.',
    buttonLabel: '갤러리 이미지 추가',
    single: false,
  },
  {
    slot: 'footer',
    label: '푸터 이미지',
    description: '페이지 하단 마무리 이미지를 관리합니다.',
    buttonLabel: '푸터 이미지 추가',
    single: true,
  },
];

const EMPTY_DRAFT = {
  files: [],
  caption: '',
  targetUrl: '',
  displayOrder: '0',
  isVisible: true,
};

const normalizeGroupedMedia = (items) => {
  const grouped = {
    hero: [],
    couple: [],
    gallery: [],
    footer: [],
  };

  items.forEach((item) => {
    const slot = item.slot || 'gallery';
    if (!grouped[slot]) {
      grouped[slot] = [];
    }
    grouped[slot].push(item);
  });

  Object.keys(grouped).forEach((slot) => {
    grouped[slot] = [...grouped[slot]].sort(
      (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0),
    );
  });

  return grouped;
};

const toMediaArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.media)) {
    return data.media;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (data && typeof data === 'object') {
    const groupedItems = [];

    if (data.hero) {
      groupedItems.push({ ...data.hero, slot: data.hero.slot || 'hero' });
    }

    if (data.couple) {
      groupedItems.push({ ...data.couple, slot: data.couple.slot || 'couple' });
    }

    if (data.footer) {
      groupedItems.push({ ...data.footer, slot: data.footer.slot || 'footer' });
    }

    if (Array.isArray(data.gallery)) {
      groupedItems.push(
        ...data.gallery.map((item) => ({ ...item, slot: item.slot || 'gallery' })),
      );
    }

    if (groupedItems.length > 0) {
      return groupedItems;
    }
  }

  return [];
};

const EditableMediaItemCard = ({ item, accessToken, onSaved, onDeleted }) => {
  const [form, setForm] = useState({
    caption: item.caption || '',
    targetUrl: item.targetUrl || '',
    displayOrder: String(item.displayOrder ?? 0),
    isVisible: item.isVisible !== false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      caption: item.caption || '',
      targetUrl: item.targetUrl || '',
      displayOrder: String(item.displayOrder ?? 0),
      isVisible: item.isVisible !== false,
    });
  }, [item.caption, item.displayOrder, item.id, item.isVisible, item.targetUrl]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      await updateInvitationMedia({
        accessToken,
        id: item.id,
        caption: form.caption,
        targetUrl: form.targetUrl,
        displayOrder: Number(form.displayOrder) || 0,
        isVisible: form.isVisible,
      });
      await onSaved();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 이미지를 삭제할까요?')) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await deleteInvitationMedia({ accessToken, id: item.id });
      await onDeleted();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="admin-list-card invitation-media-item-card">
      <div className="invitation-media-item-card__preview">
        <img src={item.publicUrl} alt={item.caption || item.originalName || '청첩장 이미지'} />
      </div>

      <label>
        <span>캡션</span>
        <input
          type="text"
          value={form.caption}
          onChange={(event) => setForm((prev) => ({ ...prev, caption: event.target.value }))}
        />
      </label>

      <label>
        <span>링크 주소</span>
        <input
          type="url"
          value={form.targetUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, targetUrl: event.target.value }))}
          placeholder="https://..."
        />
      </label>

      <label>
        <span>순서</span>
        <input
          type="number"
          value={form.displayOrder}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, displayOrder: event.target.value }))
          }
        />
      </label>

      <label className="invitation-media-item-card__toggle">
        <input
          type="checkbox"
          checked={form.isVisible}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, isVisible: event.target.checked }))
          }
        />
        <span>{form.isVisible ? '공개 중' : '숨김 중'}</span>
      </label>

      {error && <p className="admin-shell__error">{error}</p>}

      <div className="admin-list-card__actions">
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '저장 중...' : '저장'}
        </button>
        <button type="button" onClick={handleDelete} disabled={isSaving}>
          삭제
        </button>
      </div>
    </article>
  );
};

EditableMediaItemCard.propTypes = {
  accessToken: PropTypes.string.isRequired,
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    publicUrl: PropTypes.string.isRequired,
    caption: PropTypes.string,
    originalName: PropTypes.string,
    targetUrl: PropTypes.string,
    displayOrder: PropTypes.number,
    isVisible: PropTypes.bool,
  }).isRequired,
  onDeleted: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

const SlotEditor = ({ slot, accessToken, items, onReload }) => {
  const definition = useMemo(
    () => SLOT_DEFINITIONS.find((entry) => entry.slot === slot),
    [slot],
  );
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDraft(EMPTY_DRAFT);
  }, [slot]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (draft.files.length === 0) {
      setError('업로드할 파일을 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const baseDisplayOrder = Number(draft.displayOrder) || 0;

      for (const [index, file] of draft.files.entries()) {
        const optimizedFile = await optimizeImageForUpload(file);
        await createInvitationMedia({
          accessToken,
          file: optimizedFile,
          slot,
          caption: resolveCaption(draft.caption, file, index, draft.files.length),
          targetUrl: draft.targetUrl,
          displayOrder: definition?.single ? 0 : baseDisplayOrder + index,
          isVisible: draft.isVisible,
          replaceExisting: definition?.single ?? false,
        });
      }

      setDraft(EMPTY_DRAFT);
      event.target.reset();
      await onReload();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemSaved = async () => {
    await onReload();
  };

  const handleItemDeleted = async () => {
    await onReload();
  };

  return (
    <section className="admin-panel-stack invitation-media-slot">
      <div className="admin-shell__panel invitation-media-slot__header">
        <h2>{definition?.label || slot}</h2>
        <p>{definition?.description}</p>
        <small>
          {definition?.single
            ? '한 장만 활성화되는 슬롯입니다.'
            : '여러 장을 순서대로 관리할 수 있습니다.'}
        </small>
      </div>

      {items.length > 0 ? (
        <div className={slot === 'gallery' ? 'invitation-media-gallery-grid' : 'admin-panel-stack'}>
          {items.map((item) => (
            <EditableMediaItemCard
              key={item.id}
              accessToken={accessToken}
              item={item}
              onDeleted={handleItemDeleted}
              onSaved={handleItemSaved}
            />
          ))}
        </div>
      ) : (
        <p className="admin-shell__empty">등록된 이미지가 없습니다.</p>
      )}

      <form className="admin-upload-form invitation-media-upload-form" onSubmit={handleSubmit}>
        <label>
          <span>이미지 파일</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, files: normalizeFiles(event.target.files) }))
            }
          />
          <small className="admin-shell__summary-note">
            {draft.files.length > 0
              ? `${draft.files.length}개 이미지 선택됨`
              : definition?.single
                ? `여러 장을 선택하면 마지막 업로드 이미지가 현재 공개 이미지가 됩니다. ${IMAGE_UPLOAD_HINT}`
                : `여러 장을 선택하면 순서대로 연속 등록됩니다. ${IMAGE_UPLOAD_HINT}`}
          </small>
        </label>

        <label>
          <span>캡션</span>
          <input
            type="text"
            value={draft.caption}
            onChange={(event) => setDraft((prev) => ({ ...prev, caption: event.target.value }))}
            placeholder="비워두면 파일명으로 저장됩니다"
          />
        </label>

        <label>
          <span>링크 주소</span>
          <input
            type="url"
            value={draft.targetUrl}
            onChange={(event) => setDraft((prev) => ({ ...prev, targetUrl: event.target.value }))}
            placeholder="https://..."
          />
        </label>

        <label>
          <span>순서</span>
          <input
            type="number"
            value={draft.displayOrder}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, displayOrder: event.target.value }))
            }
          />
        </label>

        <label className="invitation-media-item-card__toggle">
          <input
            type="checkbox"
            checked={draft.isVisible}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, isVisible: event.target.checked }))
            }
          />
          <span>공개 노출</span>
        </label>

        {error && <p className="admin-shell__error">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : definition?.buttonLabel || '이미지 추가'}
        </button>
      </form>
    </section>
  );
};

SlotEditor.propTypes = {
  accessToken: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    }),
  ).isRequired,
  onReload: PropTypes.func.isRequired,
  slot: PropTypes.oneOf(['hero', 'couple', 'gallery', 'footer']).isRequired,
};

const InvitationMediaAdminPanel = ({ accessToken }) => {
  const [media, setMedia] = useState({
    hero: [],
    couple: [],
    gallery: [],
    footer: [],
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await fetchAdminInvitationMedia(accessToken);
      const items = toMediaArray(data);
      setMedia(normalizeGroupedMedia(items));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  return (
    <div className="admin-panel-stack">
      <div className="admin-shell__panel invitation-media-summary">
        <h2>청첩장 이미지 관리</h2>
        <p>공개 청첩장에 쓰이는 이미지를 슬롯별로 관리합니다. 현재 디자인은 그대로 유지됩니다.</p>
        {isLoading && <p className="admin-shell__summary-note">불러오는 중...</p>}
        {error && <p className="admin-shell__error">{error}</p>}
      </div>

      {SLOT_DEFINITIONS.map((definition) => (
        <SlotEditor
          key={definition.slot}
          accessToken={accessToken}
          items={media[definition.slot] || []}
          onReload={loadMedia}
          slot={definition.slot}
        />
      ))}
    </div>
  );
};

InvitationMediaAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default InvitationMediaAdminPanel;
