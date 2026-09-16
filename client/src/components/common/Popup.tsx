import React, { ReactNode, useEffect } from 'react'
import { LuX, LuAlertCircle, LuCheckCircle, LuInfo, LuAlertTriangle } from 'react-icons/lu'

interface PopupProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
    type?: 'info' | 'success' | 'warning' | 'error'
    showCloseButton?: boolean
}

interface ConfirmPopupProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'error' | 'info'
}

interface InputPopupProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (value: string) => void
    title: string
    placeholder?: string
    initialValue?: string
    type?: 'text' | 'password'
}

const Popup: React.FC<PopupProps> = ({
    isOpen,
    onClose,
    title,
    children,
    type = 'info',
    showCloseButton = true
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <LuCheckCircle className="text-primary" size={24} />,
                    borderColor: 'border-primary'
                }
            case 'warning':
                return {
                    icon: <LuAlertTriangle className="text-yellow-500" size={24} />,
                    borderColor: 'border-yellow-500'
                }
            case 'error':
                return {
                    icon: <LuAlertCircle className="text-danger" size={24} />,
                    borderColor: 'border-danger'
                }
            default:
                return {
                    icon: <LuInfo className="text-blue-500" size={24} />,
                    borderColor: 'border-blue-500'
                }
        }
    }

    const { icon, borderColor } = getTypeStyles()

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
            <div 
                className={`bg-dark border-2 ${borderColor} rounded-lg shadow-xl max-w-md w-full mx-4 animate-fade-in-up`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-darkHover">
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 hover:bg-darkHover rounded"
                        >
                            <LuX size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    )
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
}) => {
    const handleConfirm = () => {
        onConfirm()
        onClose()
    }

    return (
        <Popup isOpen={isOpen} onClose={onClose} title={title} type={type}>
            <div className="space-y-4">
                <p className="text-gray-300">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-darkHover text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                            type === 'error'
                                ? 'bg-danger hover:bg-red-600 text-white'
                                : 'bg-primary hover:bg-green-600 text-black'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Popup>
    )
}

const InputPopup: React.FC<InputPopupProps> = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    placeholder = 'Enter value...',
    initialValue = '',
    type = 'text'
}) => {
    const [value, setValue] = React.useState(initialValue)

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue)
        }
    }, [isOpen, initialValue])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (value.trim()) {
            onSubmit(value.trim())
            onClose()
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit(e)
        }
    }

    return (
        <Popup isOpen={isOpen} onClose={onClose} title={title} type="info">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-darkHover border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    autoFocus
                />
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-darkHover text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!value.trim()}
                        className="px-4 py-2 bg-primary text-black rounded-md hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </Popup>
    )
}

export { Popup, ConfirmPopup, InputPopup }
