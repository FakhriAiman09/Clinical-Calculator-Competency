export default function EpaKfDesc({
  desc,
}: {
  desc: {
    epa: string | undefined;
    kf: string | undefined;
    epa_desc: string | undefined;
    kf_desc: string | undefined;
    sample_count: number | undefined;
  };
}) {
  return (
    <div className='bg-secondary-subtle'>
      <div className='container' style={{ maxWidth: '720px' }}>
        <div className='accordion accordion-flush' id='epa-kf-cont'>
          <div className='accordion-item'>
            <div className='accordion-header'>
              <button
                className='accordion-button collapsed bg-secondary-subtle text-truncate'
                type='button'
                data-bs-toggle='collapse'
                data-bs-target='#epa-kf'
                aria-expanded='false'
                aria-controls='epa-kf'
              >
                <span className='d-inline-block text-truncate'>
                  View EPA {desc.epa} and Key Function {desc.kf}
                  <span className='ms-2 badge bg-secondary'>{desc.sample_count && `${desc.sample_count} samples`}</span>
                </span>
              </button>
            </div>
            <div id='epa-kf' className='accordion-collapse collapse' data-bs-parent='#epa-kf-cont'>
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
