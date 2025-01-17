import { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import {
  badRequest,
  methodNotAllowed,
  notAuthenticated,
} from '@typebot.io/lib/api'
import { generatePresignedPostPolicy } from '@typebot.io/lib/s3/generatePresignedPostPolicy'
import { generatePresignedPostPolicyBlob } from '@typebot.io/lib/azure-blob/generatePresignedPostPolicy'
import { env } from '@typebot.io/env'

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'GET') {
    const user = await getAuthenticatedUser(req, res)
    if (!user) return notAuthenticated(res)
    if (
      (env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY) ||
      (env.AZURE_BLOB_CONNECTION_STRING && env.AZURE_BLOB_CONTAINER_NAME)
    ) {
      return badRequest(
        res,
        'S3 not properly configured. Missing one of those variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY'
      )
    }
    // if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
    //   return badRequest(
    //     res,
    //     'S3 not properly configured. Missing one of those variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY'
    //   )
    const filePath = req.query.filePath as string | undefined
    const fileType = req.query.fileType as string | undefined
    if (!filePath || !fileType) return badRequest(res)
    if (env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY) {
      const presignedPostPolicy = await generatePresignedPostPolicy({
        fileType,
        filePath,
      })

      return res.status(200).send({
        presignedUrl: `${presignedPostPolicy.postURL}/${presignedPostPolicy.formData.key}`,
        formData: presignedPostPolicy.formData,
      })
    } else if (
      env.AZURE_BLOB_CONNECTION_STRING &&
      env.AZURE_BLOB_CONTAINER_NAME
    ) {
      const presignedPostPolicy = await generatePresignedPostPolicyBlob({
        fileType,
        filePath,
      })

      return res.status(200).send({
        presignedUrl: `${presignedPostPolicy.presignedUrl}/${presignedPostPolicy.formData.key}`,
        formData: presignedPostPolicy.formData,
      })
    }
  }
  return methodNotAllowed(res)
}

export default handler
