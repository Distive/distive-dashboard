import { err, fromPromise, fromThrowable, Result, ResultAsync } from 'neverthrow';
import { saveAs, } from 'file-saver'
import { DeserializedManagerData } from './useManager';
import selectFiles from 'select-files'

namespace FileManager {
    export function fromManager(manager: DeserializedManagerData): Result<void, string> {
        const blob = new Blob([JSON.stringify(manager)], { type: 'application/json' });
        const saveFile = fromThrowable(() => saveAs(blob, 'dsv.json'), e => `${(e as any)?.message} FAILED TO SAVE FILE`);
        return saveFile()
    }

    export function fromFile(): ResultAsync<object, string> {
        return fromPromise(
            selectFiles({ accept: 'application/json' })
                .then(fileList => {
                    if (!fileList) {
                        throw 'NOT SELECTED'
                    } else {
                        const file = fileList[0]
                        return file.text()
                    }

                })
                .then(fileText => {
                    return JSON.parse(fileText)
                })
            , e => `${(e as any)?.message} COULD NOT OPEN FILE`)
    }
}

export default FileManager