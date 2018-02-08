﻿using System;
using System.Diagnostics;
using System.IO;
using System.Reactive.Linq;
using System.Reactive.Threading.Tasks;
using System.Text;
using System.Threading.Tasks;

namespace Tweek.Publishing.Service.Utils
{
  public enum OutputType
  {
    StdOut,
    StdErr
  }

  internal static class ObservableExtentions
  {
    public static IObservable<T> With<T,U>(this IObservable<T> @this, IObservable<U> other) =>
      @this.Merge(other.IgnoreElements().Select(x=>default(T)));
   }

  internal static class StreamExtentions
  {

    public static T[] Slice<T>(this T[] @this, int count)
    {
      var slice = new T[count];
      Buffer.BlockCopy(@this, 0, slice, 0, count);
      return slice;
    }
    public static IObservable<byte[]> ToObservable(this Stream @this, int bufferSize = 1024)
    {
      return Observable.FromAsync(async ct =>
      {
        var buffer = new byte[bufferSize];
        var read = await @this.ReadAsync(buffer, 0, bufferSize, ct);
        return (read, buffer);
      })
      .Repeat()
      .TakeWhile(x => x.read > 0)
      .Select(x => x.read == bufferSize ? x.buffer : x.buffer.Slice(x.read));
    }
  }

  public static class ShellHelper
  {
    public delegate (Process, Task) ShellExecutor(string command, string args, Action<ProcessStartInfo> paramsInit = null);

    public static readonly ShellExecutor Executor = ExecProcess;

    public static (Process, Task) ExecProcess(string command, string args, Action<ProcessStartInfo> paramsInit = null)
    {
      //var escapedArgs = args.Replace("\"", "\\\"");
      var startInfo = new ProcessStartInfo
      {
        FileName = command,
        Arguments = args,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
      };
      paramsInit?.Invoke(startInfo);
      var process = new Process
      {
        EnableRaisingEvents = true,
        StartInfo = startInfo
      };

      var exited = Observable.FromEventPattern(
          x => process.Exited += x, x=> process.Exited -= x).Take(1).ToTask();


      if (!process.Start())
      {
        throw new Exception("failed to start process");
      };
      return (process, exited);
    }

    public static IObservable<(byte[] data, OutputType outputType)> ExecObservable(this ShellExecutor shellExecutor, string command, string args, Action<ProcessStartInfo> paramsInit = null)
    {
      return Observable.Defer(() =>
      {
        var (process, exited) = shellExecutor(command, args, paramsInit);
        var sbErr = new StringBuilder();
        
        return process.StandardOutput.BaseStream.ToObservable().Select(data => (data, OutputType.StdOut))
            .Merge(process.StandardError.BaseStream.ToObservable().Select(data =>
                    {
                      sbErr.Append(Encoding.Default.GetString(data));
                      return (data, OutputType.StdErr);
                    })
            )
            .With(exited.ToObservable().Do(_ =>{ 
                if (process.ExitCode != 0) throw new Exception($"proccess failed")
                {
                  Data ={
                                    ["ExitCode"] = process.ExitCode,
                                    ["StdErr"] = sbErr.ToString()
                        }
                };
            }))
            .Publish().RefCount();
      });

    }

    public static async Task<string> ExecTask(this ShellExecutor shellExecutor, string command, string args, Action<ProcessStartInfo> paramsInit = null)
    {
      return await shellExecutor.ExecObservable(command, args, paramsInit)
              .Where(x => x.outputType == OutputType.StdOut)
              .Aggregate("", (acc, x) => acc + Encoding.Default.GetString(x.data));
    }

    public static Func<string, Task<string>> CreateCommandExecutor(this ShellExecutor shellExecutor, string command, Action<ProcessStartInfo> paramsInit = null) => args =>
               shellExecutor.ExecTask(command, args, paramsInit);
  }
}