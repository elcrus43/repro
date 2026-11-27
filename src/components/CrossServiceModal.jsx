import React, { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, Upload, Trash2, UserPlus, Search, Paperclip } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToastContext } from './Toast';
import {
  CROSS_SERVICE_TEMPLATES,
  CROSS_SERVICE_STATUSES,
  getCrossServiceTemplate,
  formatCrossServiceShareText,
} from '../data/crossServices';
import { formatPhone, stripPhone } from '../utils/format';
import { nanoid } from '../utils/nanoid';

function buildInitialDetails(template, client, currentUser, existingDetails = {}) {
  const details = { ...existingDetails };
  const clientName = client?.full_name || '';
  const clientPhone = client?.phone ? formatPhone(client.phone, true) : '';
  const clientEmail = client?.email || '';
  const agentEmail = currentUser?.email || '';

  for (const field of template.fields) {
    if (details[field.key]) continue;
    if (field.role === 'client_name' && clientName) details[field.key] = clientName;
    if (field.role === 'client_phone' && clientPhone) details[field.key] = clientPhone;
    if (field.role === 'client_email') {
      if (field.key === 'agent_email' && agentEmail) details[field.key] = agentEmail;
      else if (field.key !== 'agent_email' && clientEmail) details[field.key] = clientEmail;
    }
  }
  return details;
}

export function CrossServiceModal({
  isOpen,
  onClose,
  initialItem = null,
  initialClientId = null,
  initialServiceType = 'rentier_insurance',
}) {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();

  const isEdit = Boolean(initialItem?.id);
  const [serviceType, setServiceType] = useState(
    initialItem?.service_type || initialServiceType || CROSS_SERVICE_TEMPLATES[0].id
  );
  const [status, setStatus] = useState(initialItem?.status || 'new');
  const [clientId, setClientId] = useState(initialItem?.client_id || initialClientId || '');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [createCrmClient, setCreateCrmClient] = useState(false);
  const [price, setPrice] = useState(initialItem?.price ?? '');
  const [commission, setCommission] = useState(initialItem?.commission ?? '');
  const [notes, setNotes] = useState(initialItem?.notes || '');
  const [attachments, setAttachments] = useState(
    Array.isArray(initialItem?.attachments) ? initialItem.attachments : []
  );
  const [copied, setCopied] = useState(false);

  const selectedClient = useMemo(
    () => (state.clients || []).find(c => c.id === clientId) || null,
    [state.clients, clientId]
  );

  const template = useMemo(() => getCrossServiceTemplate(serviceType), [serviceType]);

  const [details, setDetails] = useState(() =>
    buildInitialDetails(
      getCrossServiceTemplate(initialItem?.service_type || initialServiceType),
      (state.clients || []).find(c => c.id === (initialItem?.client_id || initialClientId)) || null,
      state.currentUser,
      initialItem?.details || {}
    )
  );

  // При смене клиента или шаблона дозаполняем пустые поля контактов
  useEffect(() => {
    setDetails(prev => buildInitialDetails(template, selectedClient, state.currentUser, prev));
  }, [template, selectedClient, state.currentUser]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const list = state.clients || [];
    if (!q) return list.slice(0, 8);
    const cleanQ = q.replace(/\D/g, '');
    return list
      .filter(c =>
        c.full_name?.toLowerCase().includes(q) ||
        (cleanQ.length >= 3 && stripPhone(c.phone || '').includes(cleanQ))
      )
      .slice(0, 8);
  }, [state.clients, clientSearch]);

  if (!isOpen) return null;

  const setField = (key, val) => {
    setDetails(prev => ({ ...prev, [key]: val }));
  };

  const extractTopLevel = () => {
    const nameField = template.fields.find(f => f.role === 'client_name');
    const phoneField = template.fields.find(f => f.role === 'client_phone');
    const emailField = template.fields.find(f => f.role === 'client_email' && f.key !== 'agent_email');
    const addrField = template.fields.find(f => f.role === 'address');

    const rawName = (nameField && details[nameField.key]) || selectedClient?.full_name || '';
    const rawPhone = (phoneField && details[phoneField.key]) || selectedClient?.phone || '';
    const rawEmail = (emailField && details[emailField.key]) || selectedClient?.email || '';
    const rawAddr = (addrField && details[addrField.key]) || '';

    return {
      client_name: String(rawName).trim(),
      client_phone: stripPhone(rawPhone),
      client_email: String(rawEmail).trim(),
      address: String(rawAddr).trim(),
    };
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.size > 4 * 1024 * 1024) {
        toast.error(`Файл «${file.name}» больше 4 МБ`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [
          ...prev,
          {
            id: nanoid(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            url: reader.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleCopyText = async () => {
    const text = formatCrossServiceShareText({
      service_type: serviceType,
      details,
      notes,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Заявка скопирована в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать текст');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const top = extractTopLevel();

    // Проверка обязательных полей шаблона
    for (const f of template.fields) {
      if (f.required && !String(details[f.key] || '').trim()) {
        toast.error(`Заполните поле: ${f.label}`);
        return;
      }
    }

    let finalClientId = clientId || null;

    // Если клиент не выбран, но включена галочка "Создать клиента в CRM"
    if (!finalClientId && createCrmClient && top.client_name) {
      const newClientId = nanoid();
      await dispatch({
        type: 'ADD_CLIENT',
        client: {
          id: newClientId,
          full_name: top.client_name,
          phone: top.client_phone,
          email: top.client_email,
          client_types: ['cross_service'],
          status: 'new',
          source: 'Кросс-услуги',
          notes: `Заявка: ${template.title}`,
          realtor_id: state.currentUser?.id || null,
        },
      });
      finalClientId = newClientId;
    }

    const payload = {
      ...(initialItem || {}),
      id: initialItem?.id || nanoid(),
      realtor_id: initialItem?.realtor_id || state.currentUser?.id || null,
      client_id: finalClientId,
      service_type: serviceType,
      status,
      client_name: top.client_name,
      client_phone: top.client_phone,
      client_email: top.client_email,
      address: top.address,
      price: price !== '' && price !== null ? Number(price) : null,
      commission: commission !== '' && commission !== null ? Number(commission) : null,
      details,
      attachments,
      notes: notes.trim(),
    };

    const ok = await dispatch({
      type: isEdit ? 'UPDATE_CROSS_SERVICE' : 'ADD_CROSS_SERVICE',
      item: payload,
    });

    if (ok !== false) {
      toast.success(isEdit ? 'Заявка обновлена' : 'Заявка на кросс-услугу создана');
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '92vh',
          background: 'var(--surface)',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
              {isEdit ? 'Редактировать заявку' : 'Новая заявка на кросс-услугу'}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {template.title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-light)', color: 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Тип услуги и Статус */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Услуга
              </label>
              <select
                value={serviceType}
                onChange={e => setServiceType(e.target.value)}
                disabled={isEdit}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--bg-light)',
                  color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                {CROSS_SERVICE_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Статус заявки
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--bg-light)',
                  color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                {CROSS_SERVICE_STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Привязка к клиенту CRM */}
          <div style={{
            padding: 12, borderRadius: 14, background: 'var(--bg-light)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Клиент в CRM: {selectedClient ? (
                  <span style={{ color: 'var(--primary)' }}>
                    {selectedClient.full_name} {selectedClient.phone ? `(${formatPhone(selectedClient.phone)})` : ''}
                  </span>
                ) : 'Не привязан'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {selectedClient && !initialClientId && (
                  <button
                    type="button"
                    onClick={() => setClientId('')}
                    style={{
                      padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    Отвязать
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowClientPicker(p => !p)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none',
                    background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Search size={12} /> {selectedClient ? 'Сменить' : 'Выбрать из CRM'}
                </button>
              </div>
            </div>

            {showClientPicker && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Поиск клиента по ФИО или телефону..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                    borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5,
                  }}
                />
                <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClientId(c.id);
                        setShowClientPicker(false);
                        setCreateCrmClient(false);
                      }}
                      style={{
                        textAlign: 'left', padding: '7px 10px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--surface)',
                        color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{c.full_name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.phone ? formatPhone(c.phone) : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!clientId && !isEdit && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={createCrmClient}
                  onChange={e => setCreateCrmClient(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <UserPlus size={14} color="var(--primary)" />
                <span>Автоматически создать карточку клиента в CRM (тип «Кросс-услуги»)</span>
              </label>
            )}
          </div>

          {/* Динамические поля формы по шаблону */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {template.fields.map(field => {
              const val = details[field.key] ?? '';
              const isFullWidth = field.type === 'textarea';
              return (
                <div key={field.key} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {field.label} {field.required ? <span style={{ color: '#ef4444' }}>*</span> : null}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={val}
                      onChange={e => setField(field.key, e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 12,
                        border: '1px solid var(--border)', background: 'var(--bg-light)',
                        color: 'var(--text)', fontSize: 13,
                      }}
                    >
                      <option value="">Выберите...</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={val}
                      placeholder={field.placeholder || ''}
                      onChange={e => setField(field.key, e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12,
                        border: '1px solid var(--border)', background: 'var(--bg-light)',
                        color: 'var(--text)', fontSize: 13, resize: 'vertical',
                      }}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={val}
                      required={Boolean(field.required)}
                      placeholder={field.placeholder || (field.type === 'tel' ? '+7 (___) ___-__-__' : '')}
                      onChange={e => {
                        const raw = e.target.value;
                        setField(field.key, field.type === 'tel' ? formatPhone(raw, true) : raw);
                      }}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12,
                        border: '1px solid var(--border)', background: 'var(--bg-light)',
                        color: 'var(--text)', fontSize: 13,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Финансы и заметка */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Стоимость услуги (₽)
              </label>
              <input
                type="number"
                value={price}
                placeholder="0"
                onChange={e => setPrice(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--bg-light)',
                  color: 'var(--text)', fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Комиссия агента (₽)
              </label>
              <input
                type="number"
                value={commission}
                placeholder="0"
                onChange={e => setCommission(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--bg-light)',
                  color: 'var(--text)', fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Вложения (фото/документы) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Фото и документы ({attachments.length})
              </label>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 10, border: '1px dashed var(--primary)',
                background: 'rgba(0, 82, 255, 0.06)', color: 'var(--primary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                <Upload size={14} /> Прикрепить файлы
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {attachments.map(att => (
                  <div key={att.id || att.name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', borderRadius: 10, background: 'var(--bg-light)',
                    border: '1px solid var(--border)', fontSize: 12,
                  }}>
                    <Paperclip size={13} />
                    <a href={att.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter(a => (a.id || a.name) !== (att.id || att.name)))}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Комментарий
            </label>
            <textarea
              rows={2}
              value={notes}
              placeholder="Дополнительные заметки по заявке..."
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--bg-light)',
                color: 'var(--text)', fontSize: 13,
              }}
            />
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <button
              type="button"
              onClick={handleCopyText}
              className="btn btn-secondary"
              style={{ borderRadius: 12, height: 42, padding: '0 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              {copied ? 'Скопировано' : 'Копировать заявку'}
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ borderRadius: 12, height: 42, padding: '0 16px', fontSize: 13 }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ borderRadius: 12, height: 42, padding: '0 20px', fontSize: 13, fontWeight: 600 }}
              >
                {isEdit ? 'Сохранить' : 'Создать заявку'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
