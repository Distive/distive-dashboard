import { Actor, ActorMethod, ActorSubclass, HttpAgent, KeyPair } from '@dfinity/agent'
import { Ed25519KeyIdentity } from '@dfinity/identity'
import { IDL } from '@dfinity/candid'
import { Result, fromThrowable } from 'neverthrow';
import { replicaHost } from './constants';

export namespace ChatCanisterActor {
    type IDLParam = Parameters<IDL.InterfaceFactory>[0];


    export const idlFactory = ({ IDL }: IDLParam) => {
        const export_param = IDL.Record({ 'cursor': IDL.Nat16 });
        const export_chunk = IDL.Record({
            'data': IDL.Vec(IDL.Nat8),
            'next_cursor': IDL.Opt(IDL.Nat16),
        });
        const status = IDL.Record({
            'time_created': IDL.Nat64,
            'is_empty': IDL.Bool,
            'remaining_cycles': IDL.Nat64,
        });
        return IDL.Service({
            import_comments: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Bool], []),
            status: IDL.Func([], [status], ['query']),
            export_comments: IDL.Func([export_param], [export_chunk], ['query']),
        })
    }

    interface Service {
        import_comments: ActorMethod<[Uint8Array], boolean>,
        status: ActorMethod<[], { time_created: bigint, is_empty: boolean, remaining_cycles: bigint }>,
        export_comments: ActorMethod<[{ cursor: number }], { data: Uint8Array, next_cursor: number | null }>,
    }

    export function actorFromIdentity(canisterId: string, identity?: Ed25519KeyIdentity): ActorSubclass<Service> {
        const agent = new HttpAgent({ identity, host: replicaHost })
        if (process.env.NODE_ENV !== "production") {
            agent.fetchRootKey().catch(err => {
                console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
                console.error(err);
            });
        }
        return Actor.createActor<Service>(idlFactory, { agent, canisterId })
    }

}


