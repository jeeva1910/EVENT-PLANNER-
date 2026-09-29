import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Eye,
  CheckSquare,
  HelpCircle,
  FileText,
  Settings,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { IRegistrationFormConfig, ICustomQuestion, CustomQuestionType, IFormFieldSetting } from '../types';

interface RegistrationFormBuilderProps {
  config: IRegistrationFormConfig;
  onChange: (config: IRegistrationFormConfig) => void;
}

export const RegistrationFormBuilder: React.FC<RegistrationFormBuilderProps> = ({ config, onChange }) => {
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<CustomQuestionType>('short_text');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [newQuestionHelper, setNewQuestionHelper] = useState('');

  // Standard fields list
  const standardFields: { key: keyof Omit<IRegistrationFormConfig, 'customQuestions'>; title: string; defaultLabel: string }[] = [
    { key: 'firstName', title: 'First Name', defaultLabel: 'First Name' },
    { key: 'lastName', title: 'Last Name', defaultLabel: 'Last Name' },
    { key: 'email', title: 'Email Address', defaultLabel: 'Email Address' },
    { key: 'phone', title: 'Mobile Number', defaultLabel: 'Mobile Number' },
    { key: 'gender', title: 'Gender', defaultLabel: 'Gender' },
    { key: 'dateOfBirth', title: 'Date of Birth', defaultLabel: 'Date of Birth' },
    { key: 'college', title: 'College / Institution / Organization', defaultLabel: 'College / Institute / Organization' },
    { key: 'userType', title: 'User Type (Student/Pro/School/Fresher)', defaultLabel: 'User Type' },
    { key: 'domain', title: 'Domain / Stream', defaultLabel: 'Domain / Stream' },
    { key: 'course', title: 'Course / Degree', defaultLabel: 'Course / Degree' },
    { key: 'specialization', title: 'Course Specialization', defaultLabel: 'Course Specialization' },
    { key: 'yearOfStudy', title: 'Current Year of Study', defaultLabel: 'Current Year of Study' },
    { key: 'graduatingYear', title: 'Graduating Year', defaultLabel: 'Graduating Year' },
    { key: 'courseDuration', title: 'Course Duration', defaultLabel: 'Course Duration' },
    { key: 'cityState', title: 'City & State', defaultLabel: 'City & State' },
    { key: 'linkedin', title: 'LinkedIn Profile URL', defaultLabel: 'LinkedIn Profile' }
  ];

  const handleToggleFieldEnabled = (fieldKey: keyof Omit<IRegistrationFormConfig, 'customQuestions'>) => {
    const current = config[fieldKey] || { enabled: false, required: false, label: fieldKey };
    onChange({
      ...config,
      [fieldKey]: {
        ...current,
        enabled: !current.enabled
      }
    });
  };

  const handleToggleFieldRequired = (fieldKey: keyof Omit<IRegistrationFormConfig, 'customQuestions'>) => {
    const current = config[fieldKey] || { enabled: true, required: false, label: fieldKey };
    onChange({
      ...config,
      [fieldKey]: {
        ...current,
        required: !current.required
      }
    });
  };

  const handleFieldLabelChange = (fieldKey: keyof Omit<IRegistrationFormConfig, 'customQuestions'>, newLabel: string) => {
    const current = config[fieldKey] || { enabled: true, required: false, label: fieldKey };
    onChange({
      ...config,
      [fieldKey]: {
        ...current,
        label: newLabel
      }
    });
  };

  // Custom Questions Management
  const handleAddCustomQuestion = () => {
    if (!newQuestionLabel.trim()) return;

    const optionsList = ['dropdown', 'single_choice', 'multiple_choice'].includes(newQuestionType)
      ? newQuestionOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    const newQ: ICustomQuestion = {
      id: `cq_${Date.now()}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      options: optionsList && optionsList.length > 0 ? optionsList : ['Option 1', 'Option 2'],
      helperText: newQuestionHelper.trim() || undefined,
      order: (config.customQuestions || []).length
    };

    onChange({
      ...config,
      customQuestions: [...(config.customQuestions || []), newQ]
    });

    setNewQuestionLabel('');
    setNewQuestionType('short_text');
    setNewQuestionRequired(false);
    setNewQuestionOptions('');
    setNewQuestionHelper('');
  };

  const handleDeleteCustomQuestion = (id: string) => {
    onChange({
      ...config,
      customQuestions: (config.customQuestions || []).filter(q => q.id !== id)
    });
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const questions = [...(config.customQuestions || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[index];
    questions[index] = questions[targetIdx];
    questions[targetIdx] = temp;

    onChange({
      ...config,
      customQuestions: questions.map((q, i) => ({ ...q, order: i }))
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar with Live Preview toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Registration Form Configuration
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select which participant fields and custom questions to collect during registration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLivePreview(!showLivePreview)}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            showLivePreview
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          {showLivePreview ? 'Hide Preview' : 'Live Form Preview'}
        </button>
      </div>

      {/* Live Preview Modal / Dropdown Box */}
      {showLivePreview && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/40 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Interactive Attendee Live Preview
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              Live Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {standardFields
              .filter(f => config[f.key]?.enabled)
              .map(f => {
                const setting = config[f.key];
                return (
                  <div key={f.key} className={f.key === 'college' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {setting.label || f.title} {setting.required && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder={`Enter ${setting.label || f.title}...`}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-xs cursor-not-allowed"
                    />
                  </div>
                );
              })}
          </div>

          {config.customQuestions && config.customQuestions.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <h5 className="text-xs font-semibold text-white uppercase tracking-wider">Custom Questions</h5>
              {config.customQuestions.map(q => (
                <div key={q.id} className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    {q.label} {q.required && <span className="text-rose-400">*</span>}
                  </label>
                  {q.helperText && <p className="text-[11px] text-slate-500">{q.helperText}</p>}
                  <input
                    type="text"
                    disabled
                    placeholder={q.type === 'dropdown' ? 'Select option...' : 'Attendee response...'}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. Standard Fields Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Standard Participant Fields
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {standardFields.map(f => {
            const fieldSetting = config[f.key] || {
              enabled: ['firstName', 'email', 'phone', 'college'].includes(f.key),
              required: ['firstName', 'email'].includes(f.key),
              label: f.defaultLabel
            };

            return (
              <div
                key={f.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  fieldSetting.enabled
                    ? 'bg-slate-800/70 border-slate-700 ring-1 ring-indigo-500/20'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-white truncate">{f.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFieldEnabled(f.key)}
                      className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                        fieldSetting.enabled
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {fieldSetting.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {fieldSetting.enabled && (
                      <button
                        type="button"
                        onClick={() => handleToggleFieldRequired(f.key)}
                        className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                          fieldSetting.required
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {fieldSetting.required ? 'Required' : 'Optional'}
                      </button>
                    )}
                  </div>
                </div>

                {fieldSetting.enabled && (
                  <input
                    type="text"
                    value={fieldSetting.label || f.defaultLabel}
                    onChange={e => handleFieldLabelChange(f.key, e.target.value)}
                    placeholder="Custom field label..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Questions Builder */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Custom Registration Questions
        </h4>

        {/* Existing Custom Questions */}
        {config.customQuestions && config.customQuestions.length > 0 && (
          <div className="space-y-2.5">
            {config.customQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 font-mono">#{idx + 1}</span>
                    <span className="text-xs font-semibold text-white truncate">{q.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
                      {q.type.replace('_', ' ')}
                    </span>
                    {q.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                        Required
                      </span>
                    )}
                  </div>
                  {q.options && q.options.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Options: {q.options.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-30"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(idx, 'down')}
                    disabled={idx === config.customQuestions.length - 1}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-30"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomQuestion(q.id)}
                    className="p-1 rounded bg-slate-700 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Custom Question Form */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-3">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            Add New Question
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Question / Prompt Label</label>
              <input
                type="text"
                value={newQuestionLabel}
                onChange={e => setNewQuestionLabel(e.target.value)}
                placeholder="e.g. GitHub Profile, T-Shirt Size, Food Preferences"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Input Field Type</label>
              <select
                value={newQuestionType}
                onChange={e => setNewQuestionType(e.target.value as CustomQuestionType)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="short_text">Short Text</option>
                <option value="long_text">Long Text</option>
                <option value="dropdown">Dropdown Selection</option>
                <option value="single_choice">Single Choice Radio</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="checkbox">Agreement Checkbox</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="date">Date</option>
                <option value="url">URL</option>
              </select>
            </div>

            {['dropdown', 'single_choice', 'multiple_choice'].includes(newQuestionType) && (
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Options (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newQuestionOptions}
                  onChange={e => setNewQuestionOptions(e.target.value)}
                  placeholder="e.g. Small, Medium, Large, Extra Large"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Helper / Placeholder Text (Optional)</label>
              <input
                type="text"
                value={newQuestionHelper}
                onChange={e => setNewQuestionHelper(e.target.value)}
                placeholder="Optional instructions for attendees..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer pb-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={newQuestionRequired}
                  onChange={e => setNewQuestionRequired(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                />
                <span>Required</span>
              </label>

              <button
                type="button"
                onClick={handleAddCustomQuestion}
                disabled={!newQuestionLabel.trim()}
                className="flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
