import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            // console.log('SW Registered: ' + r)
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    if (!offlineReady && !needRefresh) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-indigo-100 p-4 max-w-sm w-[90%] md:w-full animate-in slide-in-from-bottom-5">
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                        {offlineReady ? '🚀' : '🔄'}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">
                            {offlineReady ? 'Aplikasi Siap Offline' : 'Pembaruan Tersedia!'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                            {offlineReady
                                ? 'Aplikasi FocusCouple kini dapat diakses tanpa internet.'
                                : 'Versi terbaru sudah tersedia. Muat ulang untuk update.'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                    <button
                        onClick={() => close()}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        Tutup
                    </button>
                    {needRefresh && (
                        <button
                            onClick={() => updateServiceWorker(true)}
                            className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 rounded-lg transition-all active:scale-95"
                        >
                            Update Sekarang
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ReloadPrompt
