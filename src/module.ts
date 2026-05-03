import {
  cadaide,
  type IDetailedPackageInfo,
  type IInstalledPackageInfo,
  type IPackageInfo,
  type IPackageManager,
} from "@cadaide/plugin";

cadaide.on("initialize", async () => {
  cadaide.notifications.info("Hello!");

  /*const res = await cadaide.http.get("https://api.npms.io/v2/search?q=axios");

  cadaide.notifications.warning(
    JSON.parse(res).results[0].package.name as any as string,
  );*/
});

class MyPackageManagerProvider implements IPackageManager {
  async listInstalled(): Promise<IInstalledPackageInfo[]> {
    return [
      {
        id: "axios",
        name: "Axios",
        installedVersion: "v0.1.1",
        shortDescription:
          "HTTP request library with really loooooooooooong description",
      },
    ];
  }

  async search(query: string): Promise<IPackageInfo[]> {
    const endpoint =
      "https://api.npms.io/v2/search?q=" + encodeURIComponent(query);
    const result = await cadaide.http.get(endpoint);

    return JSON.parse(result as string).results.map((pkg: any) => ({
      id: pkg.package.name,
      name: pkg.package.name,
      versions: [], // Not needed for search
      shortDescription: pkg.package.description,
    }));
  }

  async detail(id: string): Promise<IDetailedPackageInfo> {
    const endpoint = "https://registry.npmjs.org/" + encodeURIComponent(id);
    const result = await cadaide.http.get(endpoint);
    const parsed: any = JSON.parse(result as string);

    const latestVersion = parsed.versions[parsed["dist-tags"].latest];
    const repo = latestVersion.repository.url;
    const ghRepoId = repo
      .split("://")[1]
      .split("/")
      .slice(1)
      .join("/")
      .split(".")[0];

    const readmeApiUrl = "https://api.github.com/repos/" + ghRepoId + "/readme";
    const readmeResult = await cadaide.http.get(readmeApiUrl);
    const parsedReadmeResult: any = JSON.parse(readmeResult as string);

    const readmeUrl = parsedReadmeResult.download_url;
    const readme = await cadaide.http.get(readmeUrl);

    return {
      id: parsed.name,
      name: parsed.name,
      isInstalled: false,
      installedVersion: null,
      versions: Object.keys(parsed.time).toReversed(),
      shortDescription: parsed.description,
      description: readme as string,
    };
  }

  async install(id: string, version: string): Promise<void> {
    cadaide.notifications.info(`Installed ${id}@${version}`);
  }

  async uninstall(id: string): Promise<void> {
    cadaide.notifications.info(`Uninstalled ${id}`);
  }
}

cadaide.packageManager.provide(MyPackageManagerProvider);
