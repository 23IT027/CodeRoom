import React from 'react'
import { usePopup } from '../context/PopupContext'
import { Popup } from './common/Popup'

const PopupExample: React.FC = () => {
    const { showConfirm, showInput } = usePopup()

    const handleTestConfirm = async () => {
        try {
            const result = await showConfirm({
                title: "Delete Project",
                message: "Are you sure you want to delete this project? This action cannot be undone and will remove all files.",
                confirmText: "Delete",
                cancelText: "Cancel", 
                type: "error"
            })
            console.log('Confirm result:', result)
        } catch (error) {
            console.log('User cancelled')
        }
    }

    const handleTestInput = async () => {
        try {
            const result = await showInput({
                title: "Create New Project",
                placeholder: "Enter project name...",
                type: "text"
            })
            console.log('Input result:', result)
        } catch (error) {
            console.log('User cancelled')
        }
    }

    const [showInfoPopup, setShowInfoPopup] = React.useState(false)

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-white">Popup System Examples</h2>
            
            <div className="space-y-2">
                <button
                    onClick={handleTestConfirm}
                    className="px-4 py-2 bg-danger text-white rounded-md hover:bg-red-600 transition-colors"
                >
                    Test Confirm Popup (Error)
                </button>
                
                <button
                    onClick={handleTestInput}
                    className="px-4 py-2 bg-primary text-black rounded-md hover:bg-green-600 transition-colors"
                >
                    Test Input Popup
                </button>
                
                <button
                    onClick={() => setShowInfoPopup(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Test Info Popup
                </button>
            </div>

            {/* Custom Popup Example */}
            <Popup
                isOpen={showInfoPopup}
                onClose={() => setShowInfoPopup(false)}
                title="Project Information"
                type="info"
            >
                <div className="space-y-3">
                    <p className="text-gray-300">
                        This is a custom popup with project theme styling. It includes:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                        <li>Dark theme with project colors</li>
                        <li>Animated entrance and exit</li>
                        <li>Keyboard support (Escape to close)</li>
                        <li>Click outside to close</li>
                        <li>Icon based on popup type</li>
                        <li>X button with hover effects</li>
                    </ul>
                    <div className="mt-4">
                        <button
                            onClick={() => setShowInfoPopup(false)}
                            className="px-4 py-2 bg-primary text-black rounded-md hover:bg-green-600 transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </Popup>
        </div>
    )
}

export default PopupExample
