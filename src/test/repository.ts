import { Enumerable } from './../linq'

/* eslint-disable-next-line */
if(jsEnumerable == null) {
    /* eslint-disable-next-line */
    var jsEnumerable: { Enumerable: typeof Enumerable } = require('./../index')
}

import { RepositoryMock } from './setup/repository'

interface ICar {
    id: number
    location: string
    type: { 
        make: string
        model: string
    }
    year: number
}

describe('When using repository', () => {
    const repository = new RepositoryMock<ICar, number>((entity) => entity.id, [
        { id: 1, location: 'SKIEN', year: 2016, type: { make: 'SAAB', model: '9-3' } },
        { id: 2, location: 'PORSGRUNN', year: 2010, type: { make: 'NISSAN', model: 'QASHQAI' } },
        { id: 3, location: 'PORSGRUNN', year: 2005, type: { make: 'SAAB', model: '9-3' } },
        { id: 4, location: 'LANGESUND', year: 2004, type: { make: 'NISSAN', model: 'LEAF' } },
        { id: 5, location: 'BREVIK', year: 2009, type: { make: 'TOYOTA', model: 'COROLLA' } },
        { id: 6, location: 'BREVIK', year: 2014, type: { make: 'HONDA', model: 'HRV' } },
        { id: 7, location: 'HEISTAD', year: 2013, type: { make: 'TOYOTA', model: 'YARIS' } },
        { id: 8, location: 'LARVIK', year: 2009, type: { make: 'HONDA', model: 'CIVIC' } }
    ])

    it('should be able to iterate', async () => {
        let ar = await new jsEnumerable.Enumerable(repository).toArrayAsync()

        chai.expect(ar.length).to.equal(8)
    })

    it('should iterate using take', async () => {
        let total = 0

        for await(let car of new jsEnumerable.Enumerable(repository).take(2))
            total += car.year

        chai.expect(total).to.equal(2016 + 2010)
    })
})