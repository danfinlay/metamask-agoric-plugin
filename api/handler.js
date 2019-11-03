import harden from '@agoric/harden';

export default harden((terms, _inviteMaker) => {
  return harden({
    getCommandHandler() {
      return harden({
        processInbound(obj, home) {
          switch (obj.type) {
            case 'my-dappMessage': {
              return harden({type: 'my-dappResponse', orig: obj});
            }
          }
          return undefined;
        },
      });
    }
  });
});
