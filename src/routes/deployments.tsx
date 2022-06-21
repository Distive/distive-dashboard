import useLocalStorage from '@rehooks/local-storage';
import React, { useEffect } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard'
import useManager, { CanisterDataState, DeserializedManagerData, UseManagerHook } from '../lib/useManager';
import FileManager from '../lib/file'
const buttonStyle = ` font-medium shadow-md py-3 px-4  flex-row flex items-center gap-2 border-black border-2 rounded-md `



export default function Deployments() {
    const [serializedManager, setSerializedManager] = useLocalStorage('manager', {})
    const manager = useManager(serializedManager)

    useEffect(() => {
        if (manager.user.id) {
            manager.export()
                .match(manager => {
                    setSerializedManager(manager)
                }, e => {
                    setSerializedManager({})
                })
        }
    }, [manager, setSerializedManager])


    return (
        <div className='flex gap-10 flex-col items-center justify-center h-screen'>
            <section className={`grid gap-10 mt-10 mb-10`}>     
                <div className='bg-white rounded-md shadow-lg p-10 '>
                    {
                        (!manager.user.id ?
                            NotAuthenticated :
                            Authenticated
                        )(manager, setSerializedManager)
                    }
                </div>
                
                <div className='text-center'>
                    <a target='_blank' href='https://docs.distive.com/integrations' className={`text-2xl bg-white w-full ${buttonStyle}`}>
                        <h3 className='text-center w-full'>Docs/integrations</h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </a>
                </div>
            </section>
        </div>
    )
}

function NotAuthenticated(manager: UseManagerHook, setSerializedManager: (serializedManager: object) => void) {

    const handleImport = () => {
        setSerializedManager({})
        FileManager.fromFile()
            .match(manager => {
                setSerializedManager(manager)
            }, e => {
                console.error(e)
            })

    }

    const handleExport = () => {

    }

    const handleCreate = () => {
        const newManager = manager.newManager()
        newManager
            .match(manager => {
                setSerializedManager(manager)
            }, e => {
                console.log(e)
            })
    }

    return <div className='flex flex-col gap-20'>
        <ProfileDisplay
            exportProfileClicked={handleExport}
            importProfileClicked={handleImport}
            newProfileClicked={handleCreate}
            userID={manager.user.id}
        />
    </div>

}



function Authenticated(manager: UseManagerHook, setSerializedManager: (serializedManager: object) => void) {
    const { error, user, createCanister, createCanisterLoading, canisters, } = manager


    const handleImport = () => {
        setSerializedManager({})

        FileManager.fromFile()
            .match(manager => {
                setSerializedManager(manager)
            }, e => {
                console.error(e)
            })

    }

    const handleExport = () => {
        manager.export()
            .match(manager => {
                FileManager.fromManager(manager)
            }, e => {
                console.log(e)
            })
    }

    const handleCreate = () => {

    }

    return <div className=''>

        {error && <p className='text-red-500'>{error}</p>}

        <div className='flex  w-full flex-col gap-20'>
            <ProfileDisplay
                exportProfileClicked={handleExport}
                importProfileClicked={handleImport}
                newProfileClicked={handleCreate}
                userID={user.id} />
            <CanisterDisplay
                createCanisterLoading={createCanisterLoading}
                createCanister={createCanister}
                canisterState={canisters} />
        </div>
    </div>
}

interface CanisterDisplayProps {
    createCanisterLoading: boolean
    canisterState: UseManagerHook['canisters'],
    createCanister: UseManagerHook['createCanister']
}

function CanisterDisplay({ canisterState, createCanister, createCanisterLoading }: CanisterDisplayProps) {
    const [newCanisterToggle, setNewCanisterToggle] = React.useState(false)
    const [newCanisterNickname, setNewCanisterNickname] = React.useState('')


    const resetState = () => {
        setNewCanisterToggle(false)
        setNewCanisterNickname('')

    }

    const createCanisterHandler = () => {
        createCanister(newCanisterNickname)
    }

    const CanisterCreate = <>
        <h3 className='font-bold text-lg'>
            Canisters
        </h3>
        <button onClick={_ => setNewCanisterToggle(true)} className={`bg-black text-white ${buttonStyle}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 " fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
            </svg>
            New Canister
        </button>
    </>;

    const CanisterCreateInput = <div className='w-full '>
        {/* text input */}
        <h3 className='font-bold text-lg'>
            Create Canister
        </h3>
        <div className=' w-full flex gap-2'>
            {!createCanisterLoading && <input
                onChange={e => {
                    setNewCanisterNickname(e.target.value);
                }}
                className='border-black border-2 rounded-md p-2 w-full' placeholder='Enter a Canister Nickname' type='text' />}
            <div className='flex flex-row gap-1'>
                <button disabled={createCanisterLoading} onClick={_ => createCanisterHandler()} className={` bg-black text-white p-2 w-full ${buttonStyle} ${createCanisterLoading ? 'animate-pulse' : ''} `}>
                    {createCanisterLoading ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>}
                    {createCanisterLoading && 'Creating Canister'}
                </button>
                {!createCanisterLoading && <button onClick={_ => setNewCanisterToggle(false)} className={`bg-[#edf2f4e6] text-black ${buttonStyle}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>}
            </div>
        </div>
    </div>;


    return <div className='flex flex-col gap-10'>
        <div className='flex flex-row justify-between items-center relative'>
            {newCanisterToggle ? <div className='relative'>
                {CanisterCreateInput}
            </div> :
                <div className='relative'>
                    {CanisterCreate}
                </div>}


        </div>
        <div className='flex flex-col gap-5'>
            {canisterState.map((value) =>
                <CanisterCard
                    key={value.id.toString()}
                    {...value}
                />
            )}
        </div>
    </div>;
}


interface ProfileDisplayProps {
    userID: String
    importProfileClicked: () => void
    exportProfileClicked: () => void
    newProfileClicked: () => void
}

function ProfileDisplay({ userID, importProfileClicked, exportProfileClicked, newProfileClicked }: ProfileDisplayProps) {

    const newProfileButton = <button onClick={newProfileClicked} className={`bg-white ${buttonStyle}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        New Profile
    </button>

    const importProfileButton = <button onClick={importProfileClicked} className={`border-black bg-black text-white ${buttonStyle}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Import Profile
    </button>

    const exportProfileButton = <button onClick={exportProfileClicked} className={`bg-white ${buttonStyle}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Profile
    </button>


    return !userID ?
        <div>
            <div className='flex flex-col gap-2'>
                <h1 className='text-4xl font-semibold'>Distive Manager</h1>
                <h2 className='text-2xl '>Would you like to create a new profile or import one ?</h2>
                <div className='mt-6 flex gap-2'>
                    {newProfileButton}
                    {importProfileButton}
                </div>
                <p className='text-slate-500 mt-10'>
                    With Distive on the IC there’s no need for centralized authentication, your
                    security keys are never stored in the cloud but instead on your computer.
                </p>
            </div>
        </div> :

        <div className='flex flex-col gap-2'>
            <h1 className='text-4xl font-semibold'>Distive Manager</h1>
            <h2>Profile Id: {userID}</h2>
            <div className='mt-6 flex gap-2'>
                {importProfileButton}
                {exportProfileButton}
            </div>
        </div>;
}


function CanisterCard({ id, nickname, remainingCyclesInfo: { remainingCycles } }: CanisterDataState) {
    return <div className='bg-[#edf2f4e6] p-5 flex-col flex gap-5 rounded-md'>
        <h5 className='font-bold'>{nickname}</h5>
        <div>
            <h6 className='font-medium'>Cycles Remaining</h6>
            <div className='flex justify-between p-3 mt-2 text-black bg-[#DBE2E5] rounded-md'>
                <div>
                    {Intl.NumberFormat('en-US', { style: 'decimal' }).format(remainingCycles)}
                </div>
                <a target='_blank' href='https://k25co-pqaaa-aaaab-aaakq-cai.ic0.app' className='font-bold'>
                    Add Cycles
                </a>
            </div>
        </div>
        <div>
            <h6 className='font-medium'>Canister ID</h6>
            <div className='flex justify-between p-3 mt-2 text-black bg-[#DBE2E5] rounded-md'>
                <div>
                    {id}
                </div>
                <CopyToClipboard
                    text={id.toString()}
                >
                    <button className='font-bold'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </button>
                </CopyToClipboard>
            </div>
        </div>
    </div>
}
