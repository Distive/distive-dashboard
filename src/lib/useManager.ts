import { useEffect, useState } from 'react'
import { err, fromThrowable, ok, Result, ResultAsync, } from 'neverthrow'
import { DistiveTreasuryActor } from './treasuryActor'
import Ajv from 'ajv'
import { BlackHoleActor } from './blackholeActor'

function mockStall<T = void>(ms: number, value: T): Promise<T> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(value)
        }, ms)
    })
}

export interface DeserializedManagerData {
    canisters: CanisterData[];
    publicKey: string
    privateKey: string
}

interface CanisterData {
    nickname: String,
    id: String,
    remainingCyclesInfo: {
        remainingCycles: number
    }
}

export interface CanisterDataState extends CanisterData {
    remainingCyclesInfo: {
        remainingCycles: number
        loading: boolean
        error: string
    }
}

namespace CanisterData {
    export function toState(canisterData: CanisterData): CanisterDataState {
        return {
            ...canisterData,
            remainingCyclesInfo: {
                remainingCycles: canisterData.remainingCyclesInfo.remainingCycles,
                loading: true,
                error: ''
            }
        }
    }

    export function fromState(canisterDataState: CanisterDataState): CanisterData {
        const { remainingCyclesInfo, ...canisterData } = canisterDataState
        return {
            ...canisterData,
            remainingCyclesInfo: {
                remainingCycles: remainingCyclesInfo.remainingCycles
            }
        }
    }
}

export interface UseManagerHook {
    error: String
    createCanisterLoading: boolean
    createCanister: (nickname: String) => void
    user: {
        id: String,

    }
    canisters: Array<CanisterDataState>
    // refreshCanisterCycles: () => void
    export: () => Result<DeserializedManagerData, string>
    newManager: () => Result<DeserializedManagerData, string>
}

type ManagerState = {
    type: 'INITIALIZED'
    user: {
        id: string
        actor: DistiveTreasuryActor.DistiveTreasuryActorType,
        privateKey: string,
        publicKey: string
    }
    error: String
    loading: boolean
    canisters: Array<CanisterDataState>
} | {
    type: 'ERROR'
    error: String
} | { type: 'UNINITIALIZED', error: '' }

const DEFAULT_MANAGER_STATE = { type: 'UNINITIALIZED' } as ManagerState
// export const DEFAULT_SERIALIZED_MANAGER_STATE = '__DEFAULT__'
// export const ERROR_SERIALIZED_MANAGER_STATE = '__ERROR__'

const useManager = (serializedManager: object): UseManagerHook => {

    const [state, setState] = useState<ManagerState>(DEFAULT_MANAGER_STATE)
    const [createCanisterLoading, setCreateCanisterLoading] = useState(false)

    useEffect(() => {
        const state: ManagerState = parseSerializedManager(serializedManager)
            .match(deserializedManagerToManagerState, error => ({
                type: 'ERROR', error:
                    `${error} : ${typeof serializedManager} : ${JSON.stringify(serializedManager)}`
            }))
        setState(state)
        const interval = setInterval(refreshCanisterCycles, 5000)
        return () => clearInterval(interval)
    }, [serializedManager])

    // useEffect(() => {
    //      const interval = setInterval(refreshCanisterCycles, 5000)
    //     return () => clearInterval(interval)
    // }, [])


    const getCanisterCycles = (canisterId: string): ResultAsync<number, String> => {
        return ResultAsync.fromPromise(
            (() => {
                const blackHoleActor = BlackHoleActor.newActor()._unsafeUnwrap({ withStackTrace: true })
                return blackHoleActor.canister_status({ canister_id: canisterId }).then(value => Number(value.cycles))
            })(),
            e => `${e} Could Not Get Cycles For Canister ${canisterId}`);


    }


    function refreshCanisterCycles() {
        state.type === 'INITIALIZED' && state.canisters.map(({ id }) => {
            getCanisterCycles(id.toString()).map(cycles => {
                console.log(cycles)
                setState(state => {
                    if (state.type !== 'INITIALIZED') {
                        return state
                    }
                    const canisterIndex = state.canisters.findIndex(canister => canister.id === id)
                    const canister = state.canisters[canisterIndex]
                    const updatedCanister = {
                        ...canister,
                        remainingCyclesInfo: {
                            remainingCycles: cycles,
                            loading: false,
                            error: ''
                        }
                    }
                    const newCanisters = [...state.canisters.slice(0, canisterIndex), updatedCanister, ...state.canisters.slice(canisterIndex + 1)]
                    return {
                        ...state,
                        canisters: newCanisters
                    }
                })
            })
                .mapErr(error => {
                    console.error(error)
                })
        })
    }


    const createCanister = (nickname: String) => {

        if (state.type === 'INITIALIZED') {
            const actor = state.user.actor

            setCreateCanisterLoading(true)
            const stall = ResultAsync.fromPromise(actor.create_chat_canister(), e => `Could Not Create Canister`);
            stall.map(({ canister_id, message, success }) => {
                console.log(canister_id, message, success)
                setCreateCanisterLoading(false)
                setState(state => {
                    if (state.type !== 'INITIALIZED') {
                        return state
                    }

                    if (!success) {
                        return {
                            ...state,
                            error: message
                        }
                    }

                    const newCanister = {
                        nickname,
                        id: canister_id ?? '',
                        remainingCyclesInfo: {
                            remainingCycles: 0,
                            loading: true,
                            error: ''
                        }
                    }
                    return {
                        ...state,
                        canisters: [...state.canisters, newCanister]
                    }
                })
            })
        }



    }

    // const serializeManagerState = (state: ManagerState): DeserializedManagerData => {
    //     if (state.type === 'INITIALIZED') {
    //         const canisterData = state.canisters.map(CanisterData.fromState)
    //         const { privateKey, publicKey } = state.user
    //         const deserializedManagerData: DeserializedManagerData = {
    //             canisters: canisterData,
    //             privateKey,
    //             publicKey
    //         }
    //         return deserializedManagerData
    //     } else {
    //         return DEFAULT_SERIALIZED_MANAGER_STATE
    //     }
    // }

    const deserializedManagerToManagerState = (deserializedManager: DeserializedManagerData): ManagerState => {
        const { canisters, privateKey, publicKey } = deserializedManager

        if (!privateKey.length || !publicKey.length) {
            return {
                type: 'UNINITIALIZED',
                error: ''
            }
        }

        return DistiveTreasuryActor.fromKeyPair({
            privateKey,
            publicKey
        })
            .match<ManagerState>(
                ({ actor, principal }) => ({
                    type: 'INITIALIZED',
                    user: {
                        id: principal,
                        actor,
                        privateKey,
                        publicKey
                    },
                    canisters: canisters.map(CanisterData.toState),
                    error: '',
                    loading: false
                }),
                error => ({
                    type: 'ERROR',
                    error
                })
            )
    }

    const parseSerializedManager = (serializedManager: object): Result<DeserializedManagerData, String> => {
        // if (serializedManager === DEFAULT_SERIALIZED_MANAGER_STATE) {
        //     return ok({
        //         canisters: [],
        //         publicKey: '',
        //         privateKey: ''
        //     })
        // }

        // if (serializedManager === ERROR_SERIALIZED_MANAGER_STATE) {
        //     return err('ERROR DESERIALIZING MANAGER')
        // }


        const managerSchema = {
            type: 'object',
            properties: {
                canisters: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            nickname: { type: 'string' },
                            id: { type: 'string' },
                        },
                        required: ['nickname', 'id'],

                    },
                },
                remainingCyclesInfo: {
                    type: 'object',
                    properties: {
                        remainingCycles: { type: 'integer' }
                    },
                    required: ['remainingCycles']
                },
                publicKey: { type: 'string' },
                privateKey: { type: 'string' },

            },
            required: ['canisters', 'publicKey', 'privateKey']
        }

        // const parseJson = fromThrowable(JSON.parse, e => (e as any)?.message ?? 'UNABLE TO PARSE MANAGER JSON')
        const managerSchemaValidator = fromThrowable((parsedJson: object) => {
            const result = new Ajv().compile<DeserializedManagerData>(managerSchema)(parsedJson)
            if (!result) {
                throw new Error('INVALID JSON')
            }
            return parsedJson as DeserializedManagerData
        }, e => (e as any)?.message ?? 'UNABLE TO VALIDATE JSON SCHEMA')


        return managerSchemaValidator(serializedManager)
    }

    const newManager = (): Result<DeserializedManagerData, string> => {
        return DistiveTreasuryActor.createKeyPair()
            .map(({ privateKey, publicKey }) => {
                const manager = {
                    canisters: [],
                    privateKey,
                    publicKey
                }
                return manager
            })
            .mapErr(e => e.toString())
    }

    return {
        error: state.error,
        createCanisterLoading,
        createCanister,
        user: {
            id: state.type === 'INITIALIZED' ? state.user.id : '',
        },
        canisters: state.type === 'INITIALIZED' ? state.canisters : [],
        // refreshCanisterCycles,
        export: () => {
            const result: Result<DeserializedManagerData, string> = state.type === 'INITIALIZED' ? ok({
                canisters: state.canisters.map(CanisterData.fromState),
                privateKey: state.user.privateKey,
                publicKey: state.user.publicKey
            }) : err('MANAGER NOT INITIALIZED')

            return result
        },
        newManager
    }
}

export default useManager
