/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1125843985")

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "file749574446",
    "maxSelect": 1,
    "maxSize": 52428800,
    "mimeTypes": [
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/bmp",
      "video/mp4",
      "video/mpeg"
    ],
    "name": "media",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1125843985")

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "file749574446",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/bmp",
      "video/mp4",
      "video/mpeg"
    ],
    "name": "media",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
