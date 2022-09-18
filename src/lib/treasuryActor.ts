import { Actor, ActorMethod, ActorSubclass, HttpAgent } from '@dfinity/agent'
import { Ed25519KeyIdentity } from '@dfinity/identity'
import { IDL } from '@dfinity/candid'
import { fromThrowable, ok, Result } from 'neverthrow'
import { replicaHost } from './constants'

export namespace DistiveTreasuryActor {

    export type DistiveTreasuryActorType = ActorSubclass<Service>

    interface KeyPair {
        privateKey: string,
        publicKey: string
    }

    type IDLParam = Parameters<IDL.InterfaceFactory>[0];

    interface CreateChatCanisterResult {
        canister_id: string;
        message: string;
        success: boolean;
    }

    interface Status {
        canister_count: bigint;
        remaining_cycles: bigint;
    }

    interface Service {
        create_chat_canister: ActorMethod<[], CreateChatCanisterResult>,
        status: ActorMethod<[], Status>,
    }

    export const idlFactory = ({ IDL }: IDLParam) => {
        const create_chat_canister_result = IDL.Record({
            'canister_id': IDL.Text,
            'message': IDL.Text,
            'success': IDL.Bool,
        });

        const status = IDL.Record({
            'canister_count': IDL.Nat64,
            'remaining_cycles': IDL.Nat64,
        });

        return IDL.Service({
            create_chat_canister: IDL.Func([], [create_chat_canister_result], []),
            status: IDL.Func([], [status], ['query']),
        })
    };


    export function fromKeyPair(keyPair: KeyPair): Result<{ actor: ActorSubclass<Service>, principal: string }, string> {
        const canisterId = "g3lop-baaaa-aaaag-aaklq-cai"
        const { privateKey, publicKey } = keyPair

        const identityFromKeyPair = fromThrowable((publicKey, privateKey) => {
            const identity = Ed25519KeyIdentity.fromParsedJson([publicKey, privateKey])
            return {
                identity,
                principal: identity.getPrincipal().toString()
            }
        },
            e => ((e as any)?.message ?? 'UNABLE TO PARSE KEY PAIR TO IDENTITY') as string
        )


        const agentFromIdentity = fromThrowable(
            ({ identity, principal }: { identity: Ed25519KeyIdentity, principal: string }) => ({
                agent: new HttpAgent({ host: replicaHost, identity }),
                principal
            }),
            e => ((e as any)?.message ?? 'UNABLE TO CREATE AGENT FROM IDENTITY') as string
        )

        const actorFromAgent = fromThrowable(
            ({ agent, principal }: { agent: HttpAgent, principal: string }) => ({
                actor: Actor.createActor<Service>(
                    idlFactory,
                    { agent, canisterId, }
                ),
                principal
            }),
            e => ((e as any)?.message ?? 'UNABLE TO CREATE ACTOR FROM AGENT') as string
        )



        return identityFromKeyPair(publicKey, privateKey)
            .andThen(agentFromIdentity)
            .andThen(actorFromAgent)

    }

    export function createKeyPair(): Result<KeyPair, String> {
        const generateNewIdentity = fromThrowable(
            () => Ed25519KeyIdentity.generate(),
            e => (console.error((e as any)?.message), 'UNABLE TO GENERATE KEY PAIR')
        )

        return generateNewIdentity()
            .map(identity => {
                const [publicKey, privateKey] = identity.toJSON()
                return { publicKey, privateKey }
            })
        // const [publicKey,privateKey] = Ed25519KeyIdentity.generate().toJSON()
        // return ok({ publicKey, privateKey })
    }
}