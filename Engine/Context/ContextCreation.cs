﻿using System.Collections.Generic;
using Engine.Core.Context;
using Engine.Drivers.Context;
using LanguageExt;
using LanguageExt.SomeHelp;

namespace Engine.Context
{
    public static class ContextByIdentityCreation
    {
        public static GetContextValue Convert(IDictionary<string, string> data)
        {
            return key => data.ContainsKey(key) ? data[key].ToSome() : Option<string>.None;
        }

        public static GetContextByIdentity FromDriver(IContextDriver driver)
        {
            return async identity => Convert(await driver.GetContext(identity));
        }
    }
}
