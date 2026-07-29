using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ScannerApi
{
    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", builder =>
                {
                    builder
                        .SetIsOriginAllowed(_ => true) // Allow any origin (localhost, 10.203.14.169, any IP/domain)
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
                });
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            // Custom CORS & Private Network Access (PNA) Middleware - MUST be BEFORE app.UseRouting()
            app.Use(async (context, next) =>
            {
                var origin = context.Request.Headers["Origin"].ToString();
                context.Response.Headers["Access-Control-Allow-Origin"] = string.IsNullOrEmpty(origin) ? "*" : origin;
                context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                context.Response.Headers["Access-Control-Allow-Methods"] = "*";
                context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";

                if (context.Request.Method == "OPTIONS")
                {
                    context.Response.StatusCode = 200;
                    await context.Response.CompleteAsync();
                    return;
                }

                await next();
            });

            app.UseRouting();
            app.UseCors("AllowFrontend");
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}