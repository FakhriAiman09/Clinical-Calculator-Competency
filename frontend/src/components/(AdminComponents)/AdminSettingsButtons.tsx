'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const AdminSettingsButtons = () => {
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState<{ id: string; setting: string }[]>([]);
  const [newSetting, setNewSetting] = useState('');

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('clinical_settings').select('*');
    if (!error && data) setSettings(data);
  };

  useEffect(() => {
    if (showModal) fetchSettings();
  }, [showModal]);

  const handleAddSetting = async () => {
    if (!newSetting.trim()) return;
    const { error } = await supabase.from('clinical_settings').insert([{ setting: newSetting.trim() }]);
    if (!error) {
      setNewSetting('');
      fetchSettings();
    }
  };

  const handleEditSetting = async (id: string, newValue: string) => {
    await supabase.from('clinical_settings').update({ setting: newValue }).eq('id', id);
    fetchSettings();
  };

  const handleDeleteSetting = async (id: string) => {
    await supabase.from('clinical_settings').delete().eq('id', id);
    fetchSettings();
  };

  return (
    <div className='p-4 rounded bg-body-secondary' style={{ maxWidth: '39vw', width: '100%' }}>
      <div className='card shadow-sm p-3 border-0'>
        <div
          className='card-header d-flex justify-content-between align-items-center bg-body border-bottom pb-2 sticky-top'
          style={{ zIndex: 10 }}
        >
          <h5 className='m-0 text-body'>Settings</h5>
        </div>
        <div className='card-body p-2'>
          <button className='btn btn-primary w-100 mt-3' onClick={() => setShowModal(true)}>
            Edit Clinical Settings
          </button>
        </div>
      </div>

      {showModal && (
        <div className='modal d-block fade show' tabIndex={-1} role='dialog'>
          <div className='modal-dialog modal-dialog-centered' role='document'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title'>Clinical Settings</h5>
                <button type='button' className='btn-close' onClick={() => setShowModal(false)}></button>
              </div>
              <div className='modal-body'>
                <div className='mb-3'>
                  <label className='form-label'>New Setting</label>
                  <input
                    type='text'
                    className='form-control'
                    value={newSetting}
                    onChange={(e) => setNewSetting(e.target.value)}
                    placeholder='Enter new setting name'
                  />
                  <button className='btn btn-success mt-2' onClick={handleAddSetting}>
                    Add Setting
                  </button>
                </div>

                <hr />
                {settings.map(({ id, setting }) => (
                  <div key={id} className='d-flex align-items-center justify-content-between mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      defaultValue={setting}
                      onBlur={(e) => handleEditSetting(id, e.target.value)}
                    />
                    <button
                      className='btn btn-outline-danger btn-sm ms-2'
                      onClick={() => handleDeleteSetting(id)}
                      aria-label='delete-setting'
                    >
                      <i className='bi bi-trash'></i>
                    </button>
                  </div>
                ))}
              </div>
              <div className='modal-footer'>
                <button className='btn btn-secondary' onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsButtons;