import React, { useState, useEffect } from 'react';

export default function DynamicForm({ schema, onSubmit, onCancel, submitLabel = "Submit" }) {
  const [formData, setFormData] = useState({});

  // Initialize form with default values
  useEffect(() => {
    const initialData = {};
    schema.fields?.forEach(field => {
      if (field.default !== undefined) {
        initialData[field.name] = field.default;
      }
      if (field.type === 'hidden' && field.value !== undefined) {
        initialData[field.name] = field.value;
      }
      // Initialize checkboxes as empty object
      if (field.type === 'checkbox') {
        initialData[field.name] = {};
      }
    });
    setFormData(initialData);
  }, [schema.fields]);

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCheckboxChange = (fieldName, optionValue, isChecked) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [optionValue]: isChecked
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🔍 DynamicForm: Submitting data:', formData);
    onSubmit(formData);
  };

  const renderField = (field) => {
    const commonProps = {
      className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      value: formData[field.name] || field.default || '',
      onChange: (e) => handleChange(field.name, e.target.value),
      required: field.required
    };

    switch (field.type) {
      case 'text':
        return <input type="text" {...commonProps} placeholder={field.placeholder} />;
      
      case 'textarea':
        return <textarea {...commonProps} rows={4} placeholder={field.placeholder} />;
      
      case 'hidden':
        return <input type="hidden" value={field.value || ''} />;
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options.map(option => {
              const value = typeof option === 'object' ? option.value : option;
              const label = typeof option === 'object' ? option.label : option;
              return (
                <label key={value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={value}
                    checked={formData[field.name] === value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        );
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option...</option>
            {field.options.map(option => {
              const value = typeof option === 'object' ? option.value : option;
              const label = typeof option === 'object' ? option.label : option;
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.options.map(option => {
              const value = typeof option === 'object' ? option.value : option;
              const label = typeof option === 'object' ? option.label : option;
              const isChecked = formData[field.name] ? formData[field.name][value] === true : false;
              
              return (
                <label key={value} className="flex items-center space-x-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={value}
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(field.name, value, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              );
            })}
          </div>
        );
      
      default:
        return <input type="text" {...commonProps} />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {schema.fields?.map(field => (
        <div key={field.name}>
          {/* Don't show label for hidden fields */}
          {field.type !== 'hidden' && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {renderField(field)}
          {field.description && field.type !== 'hidden' && (
            <p className="mt-1 text-sm text-gray-500">{field.description}</p>
          )}
        </div>
      ))}
      
      <div className="flex space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-primary"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
