import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { fetchAdminAssets, updateAssetVisibility, uploadAdminAsset } from '../../lib/admin';
import { IMAGE_UPLOAD_HINT, optimizeImageForUpload } from '../../lib/imageUpload';

const normalizeFiles = (fileList) => Array.from(fileList || []);

const resolveUploadTitle = (title, file, index, total) => {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return file.name.replace(/\.[^.]+$/, '');
  }

  if (total === 1) {
    return trimmedTitle;
  }

  return `${trimmedTitle} ${index + 1}`;
};

const AssetAdminPanel = ({ accessToken }) => {
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'invitation',
    files: [],
  });

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setError('');
        const data = await fetchAdminAssets(accessToken, form.category);
        setAssets(data);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadAssets();
  }, [accessToken, form.category]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.files.length === 0) {
      setError('업로드할 파일을 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      for (const [index, file] of form.files.entries()) {
        const optimizedFile = await optimizeImageForUpload(file);
        await uploadAdminAsset({
          file: optimizedFile,
          title: resolveUploadTitle(form.title, file, index, form.files.length),
          category: form.category,
          accessToken,
        });
      }

      setForm((prev) => ({ ...prev, title: '', files: [] }));
      event.target.reset();
      const data = await fetchAdminAssets(accessToken, form.category);
      setAssets(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVisibility = async (asset) => {
    try {
      await updateAssetVisibility(asset.id, !asset.isVisible, accessToken);
      const data = await fetchAdminAssets(accessToken, form.category);
      setAssets(data);
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="admin-panel-stack">
      <form className="admin-upload-form" onSubmit={handleSubmit}>
        <label>
          <span>자료 제목</span>
          <input
            type="text"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="단일 업로드면 그대로, 다중 업로드면 번호가 붙습니다"
          />
        </label>

        <label>
          <span>자료 유형</span>
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          >
            <option value="invitation">청첩장 노출 자료</option>
          </select>
        </label>

        <label>
          <span>파일</span>
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={(event) =>
              setForm((prev) => ({ ...prev, files: normalizeFiles(event.target.files) }))
            }
          />
          <small className="admin-shell__summary-note">
            {form.files.length > 0
              ? `${form.files.length}개 파일 선택됨`
              : `이미지/PDF 여러 개를 한 번에 선택할 수 있습니다. ${IMAGE_UPLOAD_HINT}`}
          </small>
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '업로드 중...' : '자료 업로드'}
        </button>
      </form>

      {error && <p className="admin-shell__error">{error}</p>}

      {assets.map((asset) => (
        <article key={asset.id} className="admin-list-card">
          <div className="admin-list-card__top">
            <div>
              <strong>{asset.title || asset.originalName}</strong>
              <span>{asset.mimeType}</span>
            </div>
            <button type="button" onClick={() => handleVisibility(asset)}>
              {asset.isVisible ? '숨김' : '복원'}
            </button>
          </div>
          <p>{asset.originalName}</p>
          <small>{asset.isVisible ? '공개 노출 중' : '관리자 숨김 상태'}</small>
        </article>
      ))}

      {assets.length === 0 && <p className="admin-shell__empty">등록된 자료가 없습니다.</p>}
    </div>
  );
};

AssetAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default AssetAdminPanel;
