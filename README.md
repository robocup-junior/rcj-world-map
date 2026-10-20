# RoboCupJunior World Map

An interactive map of RoboCupJunior regions, embedded on the [How to Get Started](https://junior.robocup.org/gettingstarted/) page of junior.robocup.org.

- Search and filter regions by SuperRegion, with a list that works with a keyboard and screen readers
- Clustered markers so dense areas stay readable
- Shareable links to a region, e.g. `…/rcj-world-map/#japan`
- No API keys: built with [MapLibre GL](https://maplibre.org/) and free [OpenFreeMap](https://openfreemap.org/) tiles

## Updating a region

All map data lives in [`data/regions.json`](data/regions.json). It follows the official RoboCupJunior Regional Representatives list (linked from the Getting Started page); update both together. To add or change a region, edit that file on GitHub and open a pull request. The build checks the file automatically, and the live map updates a few minutes after the pull request is merged. Nothing needs to change on the WordPress site.

Each region looks like this:

```json
{
  "id": "japan",
  "name": "Japan",
  "superregion": "asia-pacific",
  "status": "regional-rep",
  "lat": 35.6762,
  "lng": 139.6503,
  "website": "https://example.org/",
  "logo": null
}
```

| Field | Notes |
| --- | --- |
| `id` | Lowercase letters, numbers and dashes. Used in links (`#japan`). |
| `name` | Region name, without "RoboCupJunior". |
| `superregion` | `americas`, `asia-pacific` or `emea`. |
| `status` | `regional-rep` (has a Regional Representative) or `contact-person` (growing region with a contact person), as on the official Regional Representatives list. |
| `lat`, `lng` | Where the marker goes, usually the capital or the region's main city. |
| `website` | The region's RoboCupJunior website, or `null`. |
| `logo` | Path to a logo in `public/logos/` (e.g. `logos/japan.webp`, square, about 200 px), or `null`. |

The public map never shows contact emails. Regions without a website point people to junior_execs [@] lists.robocup.org, and the validation step rejects anything that looks like an email address.

## Embedding

```html
<iframe src="https://robocup-junior.github.io/rcj-world-map/"
        title="Interactive map of RoboCupJunior regions worldwide"
        style="width:100%;height:640px;border:0" loading="lazy"></iframe>
```

Add `#<region-id>` to the URL to open a specific region.

## Developing

```sh
npm install
npm run dev       # local dev server
npm run build     # validate data, type-check and build to dist/
```

Requires Node 20 or newer (CI uses Node 22).
