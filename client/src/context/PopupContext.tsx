import React, { createContext, useContext, useState, ReactNode } from 'react'
import { ConfirmPopup, InputPopup } from '../components/common/Popup'

interface PopupContextType {
    showConfirm: (options: ConfirmOptions) => Promise<boolean>
    showInput: (options: InputOptions) => Promise<string | null>
}

interface ConfirmOptions {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'error' | 'info'
}

interface InputOptions {
    title: string
    placeholder?: string
    initialValue?: string
    type?: 'text' | 'password'
}

const PopupContext = createContext<PopupContextType | undefined>(undefined)

interface PopupState {
    confirm: {
        isOpen: boolean
        options: ConfirmOptions
        resolve: (value: boolean) => void
    } | null
    input: {
        isOpen: boolean
        options: InputOptions
        resolve: (value: string | null) => void
    } | null
}

export const PopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [popupState, setPopupState] = useState<PopupState>({
        confirm: null,
        input: null
    })

    const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setPopupState(prev => ({
                ...prev,
                confirm: {
                    isOpen: true,
                    options,
                    resolve
                }
            }))
        })
    }

    const showInput = (options: InputOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            setPopupState(prev => ({
                ...prev,
                input: {
                    isOpen: true,
                    options,
                    resolve
                }
            }))
        })
    }

    const closeConfirm = () => {
        if (popupState.confirm) {
            popupState.confirm.resolve(false)
            setPopupState(prev => ({ ...prev, confirm: null }))
        }
    }

    const handleConfirm = () => {
        if (popupState.confirm) {
            popupState.confirm.resolve(true)
            setPopupState(prev => ({ ...prev, confirm: null }))
        }
    }

    const closeInput = () => {
        if (popupState.input) {
            popupState.input.resolve(null)
            setPopupState(prev => ({ ...prev, input: null }))
        }
    }

    const handleInputSubmit = (value: string) => {
        if (popupState.input) {
            popupState.input.resolve(value)
            setPopupState(prev => ({ ...prev, input: null }))
        }
    }

    return (
        <PopupContext.Provider value={{ showConfirm, showInput }}>
            {children}
            
            {/* Confirm Popup */}
            <ConfirmPopup
                isOpen={popupState.confirm?.isOpen || false}
                onClose={closeConfirm}
                onConfirm={handleConfirm}
                title={popupState.confirm?.options.title || ''}
                message={popupState.confirm?.options.message || ''}
                confirmText={popupState.confirm?.options.confirmText}
                cancelText={popupState.confirm?.options.cancelText}
                type={popupState.confirm?.options.type}
            />

            {/* Input Popup */}
            <InputPopup
                isOpen={popupState.input?.isOpen || false}
                onClose={closeInput}
                onSubmit={handleInputSubmit}
                title={popupState.input?.options.title || ''}
                placeholder={popupState.input?.options.placeholder}
                initialValue={popupState.input?.options.initialValue}
                type={popupState.input?.options.type}
            />
        </PopupContext.Provider>
    )
}

export const usePopup = (): PopupContextType => {
    const context = useContext(PopupContext)
    if (!context) {
        throw new Error('usePopup must be used within a PopupProvider')
    }
    return context
}
