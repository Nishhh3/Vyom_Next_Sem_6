interface FormInputProps {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  icon?: React.ReactNode;
}

export default function FormInput({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = false,
  icon,
}: FormInputProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors ${
            icon ? 'pl-12' : ''
          }`}
        />
      </div>
    </div>
  );
}