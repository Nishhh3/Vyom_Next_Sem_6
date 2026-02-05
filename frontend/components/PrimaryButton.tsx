interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  fullWidth = false,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  );
}