import { promisify } from 'util'
import generify from 'generify'

export default async function generate(templatePath: string, filePath: string, data: {[key: string]: string}) {
    const generifyPromise = promisify(generify);

    return await generifyPromise(templatePath, filePath, data);
}