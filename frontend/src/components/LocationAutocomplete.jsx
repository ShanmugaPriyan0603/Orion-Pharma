import { useEffect, useState, useRef } from 'react';
import { locationAPI } from '../services/api';

const LocationAutocomplete = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  required = false
}) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await locationAPI.search(query.trim(), 8);
        setSuggestions(response.data?.data || []);
      } catch (error) {
        console.error('Location autocomplete failed:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [open, query]);

  const handleSelect = (location) => {
    const formatted = location.display || location.name;
    setQuery(formatted);
    onChange(formatted);
    onSelect?.(location);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="block text-xs text-gray-500 mb-1.5 font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onChange(next);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="input-field"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
          {suggestions.map((city) => (
            <button
              key={city.id}
              type="button"
              onMouseDown={() => handleSelect(city)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <span className="font-medium text-gray-900">{city.city || city.name}</span>
              {city.state && <span className="text-gray-500">, {city.state}</span>}
              {city.country && <span className="text-gray-400 ml-1">({city.country})</span>}
            </button>
          ))}
        </div>
      )}

      {open && loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg px-4 py-3 text-sm text-gray-500">
          <span className="animate-pulse-subtle">Searching...</span>
        </div>
      )}

      {open && !loading && suggestions.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg px-4 py-3 text-sm text-gray-500">
          No locations found
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
