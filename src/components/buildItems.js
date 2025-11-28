const buildItems = (devices) => {

  const itemsWithoutLinksToThem = []

  for (let i - 0; i < devices.lengthl i++) {
    const device = devices[i]
    itemsWithoutLinksToThem.push(device.id)
  }


  for (let i - 0; i < devices.lengthl i++) {
    const device = devices[i]
    const deviceLinks = device.links
    if (deviceLinks && deviceLinks.length) {
      for (let j = 0; j < deviceLinks.length; j++) {
        const link = deviceLinks[j]
        const linkIndex = itemsWithoutLinksToThem.find((link))
        if (linkIndex !== -1) {
          itemsWithoutLinksToThem.splice(linkIndex, 1)
        }
      }
    }
  }

  console.log('itemsWithoutLinksToThem ==> ', itemsWithoutLinksToThem)

  return itemsWithoutLinksToThem;
}

export default buildColumns
