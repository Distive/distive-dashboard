import { Actor, ActorMethod, ActorSubclass, AnonymousIdentity, HttpAgent } from '@dfinity/agent'
import { IDL } from '@dfinity/candid'
import { fromThrowable, Result } from 'neverthrow'
export namespace BlackHoleActor {

    type IDLParam = Parameters<IDL.InterfaceFactory>[0];

    interface CanisterStatus {
        cycles: bigint
        memory_size: bigint
    }

    interface Service {
        canister_status: ActorMethod<[{ canister_id: string }], CanisterStatus>
    }

    const idlFactory = ({ IDL }: IDLParam) => {
        const canister_status = IDL.Record({
            cycles: IDL.Nat,
            memory_size: IDL.Nat
        })

        const canister_status_param = IDL.Record({
            canister_id: IDL.Principal
        })

        return IDL.Service({
            canister_status: IDL.Func([canister_status_param], [canister_status], ['query'])
        })
    }

    export const newActor = (): Result<ActorSubclass<Service>, string> => {
        const blackHoleCanisterId = 'e3mmv-5qaaa-aaaah-aadma-cai'
        const newAgent = fromThrowable(
            () => new HttpAgent({ host: "https://boundary.ic0.app/" }),
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