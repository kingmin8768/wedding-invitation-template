import { useEffect, useState } from 'react';

const InvitationAssets = () => {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch('/api/assets/invitation');
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setAssets(data);
      } catch {
        setAssets([]);
      }
    };

    fetchAssets();
  }, []);

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="invitation-assets" data-aos="fade-up">
      <h3 className="section-title">안내 자료</h3>
      <div className="invitation-assets-list">
        {assets.map((asset) => {
          const isImage = asset.mimeType.startsWith('image/');

          return (
            <article key={asset.id} className="invitation-asset-card">
              {isImage && <img src={asset.publicUrl} alt={asset.title || asset.originalName} />}
              <div className="invitation-asset-copy">
                <p>{asset.title || asset.originalName}</p>
                <a
                  href={asset.publicUrl}
                  rel="noreferrer"
                  target="_blank"
                  data-analytics-track="asset_open"
                  data-analytics-section="invitation-assets"
                  data-analytics-label={asset.title || asset.originalName}
                >
                  {isImage ? '이미지 열기' : '자료 열기'}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default InvitationAssets;
