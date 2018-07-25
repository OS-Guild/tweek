using System;
using System.Threading.Tasks;
using System.Diagnostics;

namespace Tweek.Publishing.Service.Sync
{
    public class RepoSynchronizer
    {
        private readonly Func<string, Task<string>> _git;

        public RepoSynchronizer(Func<string, Task<string>> gitExecutor)
        {
            _git = gitExecutor;
        }

        public async Task PushToUpstream(string commitId){
            await _git($"push origin {commitId}:master");
        }

        public async Task<string> SyncToLatest()
        {
            await _git("fetch origin +refs/heads/*:refs/heads/*");
            return await CurrentHead();
        }

        public async Task<string> CurrentHead()
        {
            return (await _git("rev-parse HEAD")).TrimEnd();
        }
    }
}