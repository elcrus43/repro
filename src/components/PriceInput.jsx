import React, { forwardRef, useRef, useImperativeHandle, useLayoutEffect, useCallback } from 'react';
import { formatPriceInput, parsePriceInput } from '../utils/format';

/**
 * Универсальный компонент для ввода денежных сумм с маской тысяч (1 000 000).
 * Сохраняет позицию курсора при редактировании в любой части строки,
 * корректно обрабатывает Backspace перед/после пробелов и вставку из буфера.
 */
export const PriceInput = forwardRef(function PriceInput(
  {
    value,
    onChange,
    onBlur,
    onKeyDown,
    placeholder = '0',
    className = 'form-input',
    style,
    suffix,
    disabled = false,
    readOnly = false,
    autoFocus = false,
    min = 0,
    max,
    name,
    id,
    'aria-label': ariaLabel,
    ...rest
  },
  ref
) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => inputRef.current);

  // Сохраняем целевую позицию курсора после форматирования
  const cursorTargetRef = useRef(null);

  // Вычисляем отображаемое значение с пробелами
  const displayValue = React.useMemo(() => {
    if (value === null || value === undefined || value === '') return '';
    return formatPriceInput(value);
  }, [value]);

  useLayoutEffect(() => {
    if (cursorTargetRef.current !== null && inputRef.current) {
      const pos = Math.min(cursorTargetRef.current, inputRef.current.value.length);
      try {
        inputRef.current.setSelectionRange(pos, pos);
      } catch {
        // Игнорируем в средах без поддержки setSelectionRange (например, тесты без jsdom)
      }
      cursorTargetRef.current = null;
    }
  }, [displayValue]);

  const handleChange = useCallback((e) => {
    const el = e.target;
    const rawVal = el.value;
    const selStart = el.selectionStart ?? rawVal.length;

    // Считаем, сколько цифр было до текущей позиции курсора
    const digitsBeforeCursor = rawVal.slice(0, selStart).replace(/\D/g, '').length;

    // Извлекаем чистые цифры
    const cleanDigits = rawVal.replace(/\D/g, '');
    let numVal = cleanDigits ? Number(cleanDigits) : 0;

    if (max !== undefined && numVal > max) {
      numVal = max;
    }

    const formatted = cleanDigits ? formatPriceInput(cleanDigits) : '';

    // Определяем позицию курсора в новой отформатированной строке
    let newPos = 0;
    let countedDigits = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        countedDigits++;
      }
      if (countedDigits === digitsBeforeCursor) {
        newPos = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) newPos = 0;
    if (digitsBeforeCursor >= cleanDigits.length) newPos = formatted.length;

    cursorTargetRef.current = newPos;

    if (onChange) {
      // Поддерживаем как сигнатуру (numVal, formatted, e), так и эмулированный event
      const syntheticEvent = {
        ...e,
        target: {
          ...el,
          value: cleanDigits ? numVal : '',
          formattedValue: formatted,
          name: name || el.name
        }
      };
      onChange(cleanDigits ? numVal : 0, formatted, syntheticEvent);
    }
  }, [onChange, max, name]);

  const handleKeyDown = useCallback((e) => {
    const el = inputRef.current;
    if (!el) return;

    // Умный Backspace: если курсор стоит сразу после пробела-разделителя,
    // удаляем цифру ПЕРЕД пробелом, а не просто пустой пробел
    if (e.key === 'Backspace' && !readOnly) {
      const { selectionStart, selectionEnd } = el;
      if (selectionStart === selectionEnd && selectionStart > 0) {
        const val = el.value;
        if (val[selectionStart - 1] === ' ') {
          e.preventDefault();
          const before = val.slice(0, selectionStart - 2);
          const after = val.slice(selectionStart);
          const nextRaw = before + after;
          const cleanDigits = nextRaw.replace(/\D/g, '');
          const numVal = cleanDigits ? Number(cleanDigits) : 0;
          const formatted = cleanDigits ? formatPriceInput(cleanDigits) : '';

          const digitsBefore = before.replace(/\D/g, '').length;
          let newPos = 0;
          let counted = 0;
          for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) counted++;
            if (counted === digitsBefore) {
              newPos = i + 1;
              break;
            }
          }
          if (digitsBefore === 0) newPos = 0;

          cursorTargetRef.current = newPos;

          if (onChange) {
            onChange(cleanDigits ? numVal : 0, formatted, {
              target: { value: cleanDigits ? numVal : '', formattedValue: formatted, name }
            });
          }
          return;
        }
      }
    }

    if (onKeyDown) onKeyDown(e);
  }, [readOnly, onChange, name, onKeyDown]);

  if (suffix) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={className}
          style={{ paddingRight: 32, ...style }}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          name={name}
          id={id}
          aria-label={ariaLabel}
          {...rest}
        />
        <span
          style={{
            position: 'absolute',
            right: 12,
            pointerEvents: 'none',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '0.9em',
            fontWeight: 500,
            userSelect: 'none'
          }}
        >
          {suffix}
        </span>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      style={style}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      name={name}
      id={id}
      aria-label={ariaLabel}
      {...rest}
    />
  );
});

export default PriceInput;
