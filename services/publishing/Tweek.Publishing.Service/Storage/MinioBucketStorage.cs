using System;
using System.IO;
using System.Reactive;
using System.Threading;
using System.Threading.Tasks;
using Minio;
using Minio.Exceptions;


namespace Tweek.Publishing.Service.Storage
{
    public class MinioBucketStorage : IObjectStorage
    {
        private readonly MinioClient _client;
        private readonly string _bucketName;

        public MinioBucketStorage(MinioClient client, string bucketName)
        {
            _client = client;
            _bucketName = bucketName;
        }

        public async Task Get(string objectName, Action<Stream> reader, CancellationToken cancellationToken = default)
        {
            var tsc = new TaskCompletionSource<Unit>();
            await _client.GetObjectAsync(_bucketName, objectName, async s =>
            {
                try
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        tsc.SetCanceled();
                        return;
                    }
                    reader(s);
                    if (cancellationToken.IsCancellationRequested)
                    {
                        tsc.SetCanceled();
                        return;
                    }
                    tsc.SetResult(Unit.Default);
                }
                catch (Exception ex)
                {
                    tsc.SetException(ex);
                }
            }, cancellationToken: cancellationToken);
            await tsc.Task;
        }

        public async Task Put(string objectName, Action<Stream> writer, string mimeType, CancellationToken cancellationToken = default)
        {
            using (var input = new MemoryStream())
            {
                writer(input);
                if (cancellationToken.IsCancellationRequested) return;
                var data = input.ToArray();
                var size = data.Length;
                using (var temp = new MemoryStream(data))
                {
                    await _client.PutObjectAsync(_bucketName, objectName, temp, size, cancellationToken: cancellationToken);
                }
            }
        }

        public static async Task<MinioBucketStorage> GetOrCreateBucket(MinioClient mc, string bucketName)
        {
            if (!await mc.BucketExistsAsync(bucketName))
            {
                await mc.MakeBucketAsync(bucketName);
            }
            return new MinioBucketStorage(mc, bucketName);
        }

        public async Task Delete(string objectName, CancellationToken cancellationToken = default)
        {
            await _client.RemoveObjectAsync(_bucketName, objectName, cancellationToken);
        }

        public async Task<bool> Exists(string objectName, CancellationToken cancellationToken = default)
        {
            try{
                await _client.StatObjectAsync(_bucketName, objectName, cancellationToken: cancellationToken);
                return true;
            } catch (ObjectNotFoundException){
                return false;
            }
        }
    }
}