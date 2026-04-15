type EpaKfSummary = Readonly<{
  epa: string | undefined;
  kf: string | undefined;
  epa_desc: string | undefined;
  kf_desc: string | undefined;
  sample_count: number | undefined;
}>;

type EpaKfDescProps = Readonly<{
  desc: EpaKfSummary;
}>;

export default function EpaKfDesc({ desc }: EpaKfDescProps) {
  const sectionIds = {
    parent: 'epa-kf-cont',
    target: 'epa-kf',
  };
  const sampleBadgeText = desc.sample_count ? `${desc.sample_count} samples` : undefined;

  return (
    <div className='bg-secondary-subtle'>
      <div className='container' style={{ maxWidth: '720px' }}>
        <div className='accordion accordion-flush' id={sectionIds.parent}>
          <div className='accordion-item'>
            <div className='accordion-header'>
              <button
                className='accordion-button collapsed bg-secondary-subtle text-truncate'
                type='button'
                data-bs-toggle='collapse'
                data-bs-target={`#${sectionIds.target}`}
                aria-expanded='false'
                aria-controls={sectionIds.target}
              >
                <span className='d-inline-block text-truncate'>
                  View EPA {desc.epa} and Key Function {desc.kf}
                  <span className='ms-2 badge bg-secondary'>{sampleBadgeText}</span>
                </span>
              </button>
            </div>
            <div
              id={sectionIds.target}
              className='accordion-collapse collapse'
              data-bs-parent={`#${sectionIds.parent}`}
            >
              <div className='accordion-body bg-secondary-subtle pt-0'>
                <div className='fw-bold pb-2'>
                  EPA {desc.epa}: {desc.epa_desc}
                </div>
                <div>
                  Key Function {desc.kf}: {desc.kf_desc}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
