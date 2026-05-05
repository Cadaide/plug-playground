import {
  cadaide,
  type IDetailedPackageInfo,
  type IInstalledPackageInfo,
  type IPackageInfo,
  type IPackageManager,
} from "@cadaide/plugin";

class PlaygroundPM implements IPackageManager {
  async listInstalled(): Promise<IInstalledPackageInfo[]> {
    const pkgs = await getNpmInstalledPackages();

    return pkgs;
  }

  async search(query: string): Promise<IPackageInfo[]> {
    const endpoint =
      "https://registry.npmjs.org/-/v1/search?text=" +
      encodeURIComponent(query);

    const result = await cadaide.http.get<any>(endpoint);

    const res = result.objects.map((pkg: any) => ({
      id: pkg.package.name,
      name: pkg.package.name,
      versions: [], // Not needed for search
      shortDescription: pkg.package.description,
    }));

    return res;
  }

  async detail(id: string): Promise<IDetailedPackageInfo> {
    const pkgInfo = await getNpmPackageInfo(id);

    const latestVersion = pkgInfo.versions[pkgInfo["dist-tags"].latest];
    const repo = latestVersion.repository.url;
    const ghRepoId = repo
      .split("://")[1]
      .split("/")
      .slice(1)
      .join("/")
      .split(".")[0];

    const readmeApiUrl = "https://api.github.com/repos/" + ghRepoId + "/readme";
    const readmeResult = await cadaide.http.get<any>(readmeApiUrl);

    const readmeUrl = readmeResult.download_url;
    const readme = await cadaide.http.get(readmeUrl);

    const allInstalled = await getNpmInstalledPackages(true);
    const installed = allInstalled.find((pkg) => pkg.id == id);

    return {
      id: pkgInfo.name,
      name: pkgInfo.name,
      isInstalled: !!installed,
      installedVersion: !!installed ? installed.installedVersion : null,
      versions: Object.keys(pkgInfo.time).toReversed(),
      shortDescription: pkgInfo.description,
      description: readme as string,
    };
  }

  async install(id: string, version: string): Promise<void> {
    await cadaide.shell.run(["bun", "install", `${id}@${version}`], {
      cwd: await cadaide.workspace.getProjectPath(),
    });
  }

  async uninstall(id: string): Promise<void> {
    await cadaide.shell.run(["bun", "uninstall", `${id}`], {
      cwd: await cadaide.workspace.getProjectPath(),
    });
  }
}

cadaide.events.on("frontend.initialized", () => {
  cadaide.notifications.info("Plugin initialized");

  cadaide.packageManager.provide(PlaygroundPM);
});

async function getNpmPackageInfo(id: string) {
  const endpoint = "https://registry.npmjs.org/" + encodeURIComponent(id);
  const result = await cadaide.http.get(endpoint);

  return result as any;
}

async function getNpmInstalledPackages(omitDescriptions: boolean = false) {
  const res = (await cadaide.shell.run(["cat", "package.json"], {
    cwd: await cadaide.workspace.getProjectPath(),
  })) as {
    stdout: string;
  };

  return Promise.all(
    Object.entries(JSON.parse(res.stdout).dependencies ?? {}).map(
      async ([id, version]: [string, unknown]) =>
        ({
          id: id,
          name: id,
          shortDescription: !omitDescriptions
            ? (await getNpmPackageInfo(id)).description
            : "",
          installedVersion: version,
        }) as IInstalledPackageInfo,
    ),
  );
}
