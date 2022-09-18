import { Actor, ActorMethod, ActorSubclass, HttpAgent } from '@dfinity/agent'
import { IDL } from '@dfinity/candid'
import { Principal } from '@dfinity/principal'
import { fromThrowable, Result } from 'neverthrow'
import { replicaHost } from './constants';
export namespace BlackHoleActor {

    type IDLParam = Parameters<IDL.InterfaceFactory>[0];
     interface definite_canister_settings {
        'freezing_threshold' : bigint,
        'controllers' : Array<Principal>,
        'memory_allocation' : bigint,
        'compute_allocation' : bigint,
    }
    
    interface CanisterStatus {
        'status': { 'stopped': null } |
        { 'stopping': null } |
        { 'running': null },
        'memory_size': bigint,
        'cycles': bigint,
        'settings': definite_canister_settings,
        'module_hash': [] | [Array<number>],
    }

    interface Service {
        canister_status: ActorMethod<[{ canister_id: Principal }], CanisterStatus>
    }

    const idlFactory = ({ IDL }: IDLParam) => {
        const canister_id = IDL.Principal;
        const definite_canister_settings = IDL.Record({
            'freezing_threshold': IDL.Nat,
            'controllers': IDL.Vec(IDL.Principal),
            'memory_allocation': IDL.Nat,
            'compute_allocation': IDL.Nat,
        });
        const canister_status = IDL.Record({
            'status': IDL.Variant({
                'stopped': IDL.Null,
                'stopping': IDL.Null,
                'running': IDL.Null,
            }),
            'memory_size': IDL.Nat,
            'cycles': IDL.Nat,
            'settings': definite_canister_settings,
            'module_hash': IDL.Opt(IDL.Vec(IDL.Nat8)),
        });

        return IDL.Service({
            'canister_status': IDL.Func(
                [IDL.Record({ 'canister_id': canister_id })],
                [canister_status],
                [],
            ),
        });
    }

    export const newActor = (): Result<ActorSubclass<Service>, string> => {
        const blackHoleCanisterId = 'e3mmv-5qaaa-aaaah-aadma-cai'
        const newAgent = fromThrowable(
            () => new HttpAgent({ host: replicaHost}),
            e => ((e as any)?.message ?? 'UNABLE TO CREATE AGENT') as string
        )
        const actorFromAgent = fromThrowable((agent: HttpAgent) => Actor.createActor<Service>(
            idlFactory,
            { agent, canisterId: blackHoleCanisterId }
        ), e => 'UNABLE TO CREATE BLACKHOLE ACTOR')


        return newAgent()
            .andThen(actorFromAgent)
    }

}